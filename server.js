const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {OAuth2Client} = require("google-auth-library");
const dotenv = require("dotenv");
const mysql = require("mysql2");
const axios = require("axios");
const mongoose = require("mongoose");
const http = require("http");
const WebSocket = require('ws');
require('dotenv').config();

const app = express();

// 🟩 Configurar CORS correctamente
const corsOptions = {
    origin: "*", // tu frontend local
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
};

// aplicar CORS a todas las rutas
app.use(cors(corsOptions));  // Aplica CORS a todas las rutas

app.use(express.json()); // parsear JSON

const server = http.createServer(app);

// 🔌 Crea el servidor WebSocket
const wss = new WebSocket.Server({server});

// Verificar si la carpeta 'uploads' existe; si no, crearla
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configuración de la base de datos
const db = mysql.createConnection({
    host: 'shinkansen.proxy.rlwy.net',
    user: 'root',
    password: 'iLXBRrCJJEhhbPdhKmeJgSSSdpJGLJUO',
    database: 'railway',
    port: 37223
});


// Conectar a MySQL
db.connect((err) => {
    if (err) {
        console.error("❌ Error conectando a la base de datos:", err);
        return;
    }
    console.log("✅ Conectado a la base de datos MySQL");
});
// Servir las imágenes estáticamente desde la carpeta 'uploads'
app.use('/uploads', express.static('uploads'));

const pool = mysql.createPool({
    host: 'shinkansen.proxy.rlwy.net',
    user: 'root',
    password: 'iLXBRrCJJEhhbPdhKmeJgSSSdpJGLJUO',
    database: 'railway',
    port: 37223
});

//conecccion a mongoDB
mongoose.connect(process.env.MONGO_URI)

    .then(() => console.log("✅ MongoDB conectado"))
    .catch(err => console.error("❌ Error al conectar MongoDB:", err));


// Configuración de Multer para subir imágenes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Nombre único con marca de tiempo + extensión original
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({storage});

// Crear cliente OAuth2 de Google
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// **Ruta para el registro de usuarios (solo clientes)**
app.post('/register', async (req, res) => {
    const {nombre, apellido, correo, contrasenia} = req.body;

    // Verifica si ya existe un usuario con ese correo
    pool.query('SELECT * FROM usuario WHERE correo = ?', [correo], async (err, results) => {
        if (err) {
            console.error('❌ Error al verificar el correo:', err);
            return res.status(500).json({message: 'Error en el servidor'});
        }

        if (results.length > 0) {
            return res.status(400).json({message: 'El correo ya está registrado'});
        }

        // Si no existe, registrar al nuevo usuario
        const hashedPassword = await bcrypt.hash(contrasenia, 10);
        const query = 'INSERT INTO usuario (nombre, apellido, correo, contrasenia, tipo) VALUES (?, ?, ?, ?, "cliente")';

        pool.query(query, [nombre, apellido, correo, hashedPassword], (err) => {
            if (err) {
                console.error('❌ Error en el registro:', err);
                return res.status(500).json({message: 'Error en el servidor'});
            }

            res.json({message: 'Usuario registrado exitosamente'});
        });
    });
});


// **Ruta de inicio de sesión con Google**
app.post('/google-login', async (req, res) => {
    try {
        const {token} = req.body;

        // Verificar el token con Google
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const {email, name, picture} = ticket.getPayload();

        // Verificar si el usuario ya existe en la base de datos
        pool.query("SELECT * FROM usuario WHERE correo = ?", [email], (err, results) => {
            if (err) {
                console.error("Error al verificar usuario:", err);
                return res.status(500).json({message: "Error en el servidor"});
            }

            if (results.length > 0) {
                // Usuario existente
                const user = results[0];
                const authToken = jwt.sign({
                    id: user.id,
                    correo: user.correo,
                    tipo: user.tipo
                }, "secreto", {expiresIn: "1h"});

                return res.json({token: authToken, tipo: user.tipo, id: user.id});
            } else {
                // Nuevo usuario (crear cuenta automáticamente)
                pool.query(
                    "INSERT INTO usuario (nombre, correo, contrasenia, tipo) VALUES (?, ?, '', 'cliente')",
                    [name, email, picture],
                    (err, result) => {
                        if (err) {
                            console.error("Error al registrar usuario de Google:", err);
                            return res.status(500).json({message: "Error en el servidor"});
                        }

                        const newUserId = result.insertId;
                        const authToken = jwt.sign({
                            id: newUserId,
                            correo: email,
                            tipo: "cliente"
                        }, "secreto", {expiresIn: "1h"});

                        res.json({token: authToken, tipo: "cliente", id: newUserId});
                    }
                );
            }
        });
    } catch (error) {
        console.error("Error en Google Login:", error);
        res.status(401).json({message: "Error en la autenticación con Google"});
    }
});

// **Ruta de inicio de sesión con correo y contraseña**
app.post('/login', (req, res) => {
    const {correo, contrasenia} = req.body;
    pool.query('SELECT * FROM usuario WHERE correo = ?', [correo], async (err, results) => {
        if (err) {
            console.error('Error en la consulta:', err);
            return res.status(500).json({message: 'Error en el servidor'});
        }
        if (results.length === 0) {
            return res.status(401).json({message: 'Usuario no encontrado'});
        }

        const user = results[0];
        const passwordMatch = await bcrypt.compare(contrasenia, user.contrasenia);
        if (!passwordMatch) {
            return res.status(401).json({message: 'Contraseña incorrecta'});
        }

        // Verificar si el usuario ya tiene una sesión activa en la tabla 'sesiones'
        pool.query('SELECT * FROM sesiones WHERE usuario_id = ?', [user.id], (err, sessionResult) => {
            if (err) {
                console.error('Error al verificar sesiones:', err);
                return res.status(500).json({message: 'Error en la verificación de sesión'});
            }

            // Si ya tiene una sesión, la eliminamos para permitir una nueva
            if (sessionResult.length > 0) {
                pool.query('DELETE FROM sesiones WHERE usuario_id = ?', [user.id], (err) => {
                    if (err) {
                        console.error('Error al eliminar sesión previa:', err);
                        return res.status(500).json({message: 'Error al eliminar sesión previa'});
                    }
                });
            }

            // Generar nuevo token
            const token = jwt.sign({id: user.id, correo: user.correo, tipo: user.tipo}, 'secreto', {expiresIn: '1h'});

            // Guardar sesión en la BD
            pool.query('INSERT INTO sesiones (usuario_id, token) VALUES (?, ?)', [user.id, token], (err) => {
                if (err) {
                    console.error('Error al guardar sesión:', err);
                    return res.status(500).json({message: 'Error al guardar sesión'});
                }
                res.json({token, tipo: user.tipo, id: user.id});
            });
        });
    });
});


app.post('/login-empleado', (req, res) => {
    const {correo, contrasenia} = req.body;

    // Buscar por correo en tabla empleados
    pool.query('SELECT * FROM empleados WHERE correo = ?', [correo], async (err, results) => {
        if (err) {
            console.error('Error en la consulta:', err);
            return res.status(500).json({message: 'Error en el servidor'});
        }

        if (results.length === 0) {
            return res.status(401).json({message: 'Empleado no encontrado'});
        }

        const empleado = results[0];

        // Validar contraseña encriptada con bcrypt
        const passwordMatch = await bcrypt.compare(contrasenia, empleado.contrasenia);
        if (!passwordMatch) {
            return res.status(401).json({message: 'Contraseña incorrecta'});
        }

        // Verificar si ya tiene sesión activa
        pool.query('SELECT * FROM sesiones WHERE usuario_id = ?', [empleado.id], (err, sessionResult) => {
            if (err) {
                console.error('Error al verificar sesión:', err);
                return res.status(500).json({message: 'Error al verificar sesión'});
            }

            const continuarLogin = () => {
                // Generar token con tipo de usuario = empleado
                const token = jwt.sign(
                    {id: empleado.id, correo: empleado.correo, tipo: 'empleado'},
                    'secreto',
                    {expiresIn: '1h'}
                );

                // Guardar sesión
                pool.query('INSERT INTO sesiones (empleado_id, token) VALUES (?, ?)', [empleado.id, token], (err) => {
                    if (err) {
                        console.error('Error al guardar sesión:', err);
                        return res.status(500).json({message: 'Error al guardar sesión'});
                    }

                    res.json({token, id: empleado.id, tipo: 'empleado'});
                });
            };

            // Si hay sesión activa, primero la eliminamos
            if (sessionResult.length > 0) {
                pool.query('DELETE FROM sesiones WHERE usuario_id = ?', [empleado.id], (err) => {
                    if (err) {
                        console.error('Error al eliminar sesión previa:', err);
                        return res.status(500).json({message: 'Error al eliminar sesión previa'});
                    }
                    continuarLogin();
                });
            } else {
                continuarLogin();
            }
        });
    });
});


// **Cerrar sesión**
app.post('/logout', (req, res) => {
    const {token} = req.body;
    if (!token) return res.status(400).json({message: 'Token requerido para cerrar sesión'});

    pool.query('DELETE FROM sesiones WHERE token = ?', [token], (err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
            return res.status(500).json({message: 'Error al cerrar sesión'});
        }
        res.json({message: 'Sesión cerrada exitosamente'});
    });
});

// **Obtener lista de clientes**
app.get('/clientes', (req, res) => {
    const {id} = req.params;
    pool.query('SELECT id, nombre, apellido, correo FROM usuario WHERE tipo = "cliente"', (err, results) => {
        if (err) {
            console.error('Error al obtener clientes:', err);
            return res.status(500).json({message: 'Error en el servidor'});
        }
        res.json(results);
    });
});
// **Modificar cliente**
app.put('/clientes/:id', (req, res) => {
    const {id} = req.params;
    const {nombre, correo, contrasenia} = req.body;

    if (!nombre || !correo) {
        return res.status(400).json({message: "Faltan datos en la solicitud"});
    }

    // Creamos una función async dentro para poder usar await
    (async () => {
        try {
            // 1. Obtener la contraseña actual
            const queryGet = 'SELECT contrasenia FROM usuario WHERE id = ?';
            const results = await new Promise((resolve, reject) => {
                pool.query(queryGet, [id], (err, results) => {
                    if (err || results.length === 0) {
                        return reject(err || new Error("Cliente no encontrado"));
                    }
                    resolve(results);
                });
            });

            // 2. Determinar la nueva contraseña
            const nuevaContrasenia =
                contrasenia && contrasenia.trim() !== ""
                    ? await bcrypt.hash(contrasenia, 10)
                    : results[0].contrasenia;

            // 3. Ejecutar la actualización
            const queryUpdate = 'UPDATE usuario SET nombre = ?, correo = ?, contrasenia = ?, tipo = "cliente" WHERE id = ?';
            await new Promise((resolve, reject) => {
                pool.query(queryUpdate, [nombre, correo, nuevaContrasenia, id], (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });

            res.json({message: "Cliente modificado exitosamente"});

        } catch (error) {
            console.error("Error en la modificación:", error);
            res.status(500).json({message: "Error al modificar cliente"});
        }
    })();
});


// **Eliminar cliente**
app.delete('/clientes/:id', (req, res) => {
    const {id} = req.params;

    pool.query('DELETE FROM usuario WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error('Error al eliminar cliente:', err);
            return res.status(500).json({message: 'Error en el servidor'});
        }
        res.json({message: 'Cliente eliminado exitosamente'});
    });
});


//Gestion Productos

// Obtener todos los productos
app.get("/productos", (req, res) => {
    db.query("SELECT * FROM producto", (err, results) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(results);
    });
});

// Agregar un nuevo producto
app.post("/productos", upload.single("imagen"), (req, res) => {
    const {nombre, descripcion, precio, stock} = req.body;
    const imagen = req.file ? `/uploads/${req.file.filename}` : "";

    db.query(
        "INSERT INTO producto (nombre, descripcion, precio, stock, imagen) VALUES (?, ?, ?, ?, ?)",
        [nombre, descripcion, precio, stock, imagen],
        (err, result) => {
            if (err) return res.status(500).json({error: err.message});
            res.json({message: "Producto agregado", id: result.insertId, imagen});
        }
    );
});

// Actualizar un producto
app.put("/productos/:id", upload.single("imagen"), (req, res) => {
    const {id} = req.params;
    const {nombre, descripcion, precio, stock} = req.body;
    const imagen = req.file ? `/uploads/${req.file.filename}` : req.body.imagenUrl;

    db.query(
        "UPDATE producto SET nombre = ?, descripcion = ?, precio = ?, stock = ?, imagen = ? WHERE id = ?",
        [nombre, descripcion, precio, stock, imagen, id],
        (err) => {
            if (err) return res.status(500).json({error: err.message});
            res.json({message: "Producto actualizado", imagen});
        }
    );
});

// Eliminar un producto
app.delete("/productos/:id", (req, res) => {
    const {id} = req.params;
    db.query("DELETE FROM producto WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({error: err.message});
        res.json({message: "Producto eliminado"});
    });
});


//Gestion de Empleados
// Obtener empleados
app.get("/empleados/:id_cliente", (req, res) => {
    const {id_cliente} = req.params;

    db.query("SELECT * FROM empleados WHERE id_cliente = ?", [id_cliente], (err, results) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(results);
    });
});

// Agregar nuevo empleado
app.post("/empleados", async (req, res) => {
    const {nombre, correo, NumSer, contrasenia, id_cliente} = req.body;

    console.log("📥 Datos recibidos al crear empleado:");
    console.log("Nombre:", nombre);
    console.log("Correo:", correo);
    console.log("NumSer:", NumSer);
    console.log("Contraseña:", contrasenia);
    console.log("ID del cliente:", id_cliente); // 👈 ESTE es el importante

    // Validar que NumSer no exista ya
    db.query("SELECT * FROM empleados WHERE NumSer = ?", [NumSer], async (err, results) => {
        if (err) return res.status(500).json({error: err.message});

        if (results.length > 0) {
            return res.status(400).json({error: "Este Número de Serie ya está registrado."});
        }

        const hashedPassword = await bcrypt.hash(contrasenia, 10);

        db.query(
            "INSERT INTO empleados (nombre, correo, NumSer, contrasenia, id_cliente) VALUES (?, ?, ?, ?, ?)",
            [nombre, correo, NumSer, hashedPassword, id_cliente],
            (err, result) => {
                if (err) return res.status(500).json({error: err.message});
                res.json({message: "Empleado registrado correctamente", id: result.insertId});
            }
        );
    });
});


// Actualizar empleado
app.put("/empleados/:id", async (req, res) => {
    const {id} = req.params;
    const {nombre, correo, NumSer, contrasenia} = req.body;

    if (contrasenia && contrasenia.trim() !== "") {
        // Si se proporcionó nueva contraseña, encriptar y actualizar todo
        const hashedPassword = await bcrypt.hash(contrasenia, 10);

        db.query(
            "UPDATE empleados SET nombre = ?, correo = ?, NumSer = ?, contrasenia = ? WHERE id = ?",
            [nombre, correo, NumSer, hashedPassword, id],
            (err, result) => {
                if (err) return res.status(500).json({error: err.message});
                if (result.affectedRows === 0)
                    return res.status(404).json({error: "Empleado no encontrado"});
                res.json({message: "Empleado actualizado con nueva contraseña"});
            }
        );
    } else {
        // Si no se proporciona nueva contraseña, actualizar sin modificarla
        db.query(
            "UPDATE empleados SET nombre = ?, correo = ?, NumSer = ? WHERE id = ?",
            [nombre, correo, NumSer, id],
            (err, result) => {
                if (err) return res.status(500).json({error: err.message});
                if (result.affectedRows === 0)
                    return res.status(404).json({error: "Empleado no encontrado"});
                res.json({message: "Empleado actualizado sin cambiar la contraseña"});
            }
        );
    }
});


// Eliminar empleado
app.delete("/empleados/:id", (req, res) => {
    const {id} = req.params;

    db.query("DELETE FROM empleados WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).json({error: err.message});
        if (result.affectedRows === 0)
            return res.status(404).json({error: "Empleado no encontrado"});
        res.json({message: "Empleado eliminado"});
    });
});
//Ecomerce
//home
//sessiones
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({message: "Token requerido"});

    const token = authHeader.split(' ')[1];

    jwt.verify(token, 'secreto', (err, user) => {
        if (err) return res.status(403).json({message: "Token inválido"});
        req.user = user;
        next();
    });
}

// Ruta protegida para obtener productos (solo con sesión)
app.get("/api/productos", verifyToken, (req, res) => {
    db.query("CALL ObtenerProductos()", (err, results) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(results[0]);
    });
});
//Carrito

// CARRITO 🛒
// Obtener carrito por usuario
app.get("/api/carrito/:id_usuario", (req, res) => {
    const {id_usuario} = req.params;
    db.query(`SELECT c.*, p.nombre, p.descripcion, p.precio
              FROM carrito c
                       JOIN producto p ON c.id_prod = p.id
              WHERE c.id_venta IS NULL
                AND c.id_usuario = ?`, [id_usuario], (err, results) => {
        if (err) return res.status(500).json({error: "Error al obtener el carrito."});
        res.json(results);
    });
});

// Agregar producto al carrito
// ✅ Ruta para agregar productos al carrito (modificada correctamente)
app.post("/api/carrito", (req, res) => {
    const {id_usuario, id_prod, cantidad, subtotal} = req.body;

    // Verificar si ya existe el producto en el carrito (sin venta finalizada)
    db.query(
        "SELECT * FROM carrito WHERE id_usuario = ? AND id_prod = ? AND id_venta IS NULL",
        [id_usuario, id_prod],
        (err, results) => {
            if (err) return res.status(500).json({error: "Error al verificar el carrito."});

            if (results.length > 0) { // ya existe en el carrito, entonces toca obtener el carrito y actualizar la cantidad


                const valores = results[0];

                db.query(
                    "UPDATE carrito SET cantidad = ?, subtotal = ? WHERE id = ?",
                    [cantidad + valores.cantidad, subtotal + parseFloat(valores.subtotal), valores.id],
                    (err) => {
                        if (err) return res.status(500).json({error: "Error al agregar al carrito."});
                        res.json({message: "Producto actualizado en el carrito."});
                    }
                );
            } else {
                // Insertar nuevo producto (no tocar stock aquí)
                db.query(
                    "INSERT INTO carrito (id_usuario, id_prod, cantidad, subtotal) VALUES (?, ?, ?, ?)",
                    [id_usuario, id_prod, cantidad, subtotal],
                    (err) => {
                        if (err) return res.status(500).json({error: "Error al agregar al carrito."});
                        res.json({message: "Producto agregado al carrito."});
                    }
                );
            }
        }
    );
});


// Eliminar producto del carrito
// Eliminar producto del carrito y recuperar stock
app.delete("/api/carrito/:id", (req, res) => {
    const carritoId = req.params.id;

    // Primero, obtenemos los datos del producto en el carrito
    db.query("SELECT * FROM carrito WHERE id = ?", [carritoId], (err, result) => {
        if (err) return res.status(500).json({error: "Error al obtener datos del carrito."});
        if (result.length === 0) return res.status(404).json({error: "Producto no encontrado en el carrito."});

        const {id_prod, cantidad} = result[0];

        // Restauramos el stock del producto
        db.query("UPDATE producto SET stock = stock + ? WHERE id = ?", [cantidad, id_prod], (err) => {
            if (err) return res.status(500).json({error: "Error al restaurar el stock."});

            // Ahora eliminamos el producto del carrito
            db.query("DELETE FROM carrito WHERE id = ?", [carritoId], (err) => {
                if (err) return res.status(500).json({error: "Error al eliminar producto del carrito."});
                res.json({message: "Producto eliminado del carrito y stock restaurado."});
            });
        });
    });
});

// PayPal
// PayPal - Crear orden
app.post("/api/paypal/create-order", async (req, res) => {
    const {total} = req.body;
    const clientId = process.env.PAYPAL_SANDBOX_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_SANDBOX_CLIENT_SECRET;
    const currency = process.env.PAYPAL_CURRENCY;
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    try {
        const tokenRes = await axios.post(
            "https://api-m.sandbox.paypal.com/v1/oauth2/token",
            "grant_type=client_credentials",
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        const accessToken = tokenRes.data.access_token;

        const orderRes = await axios.post(
            "https://api-m.sandbox.paypal.com/v2/checkout/orders",
            {
                intent: "CAPTURE",
                purchase_units: [{
                    amount: {
                        currency_code: currency,
                        value: parseFloat(total).toFixed(2),
                    },
                }],
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            }
        );

        res.json({id: orderRes.data.id});
    } catch (err) {
        console.error("❌ Error al crear orden:", err.response?.data || err.message);
        res.status(500).json({message: "Error al crear orden de PayPal"});
    }
});
// BLOQUE EN SERVER PARA CAPTURAR ORDEN Y ELIMINAR CARRITO + GUARDAR VENTA
// BLOQUE EN SERVER PARA CAPTURAR ORDEN (SOLO PAGO)
// BLOQUE EN SERVER PARA CAPTURAR ORDEN (SOLO PAGO)
app.post("/api/paypal/capture-order", async (req, res) => {
    const {orderID} = req.body;
    const clientId = process.env.PAYPAL_SANDBOX_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_SANDBOX_CLIENT_SECRET;
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    try {
        const tokenRes = await axios.post(
            "https://api-m.sandbox.paypal.com/v1/oauth2/token",
            "grant_type=client_credentials",
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        const accessToken = tokenRes.data.access_token;

        const captureRes = await axios.post(
            `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("✅ Pago capturado:", captureRes.data);

        res.json({message: "Pago capturado con éxito"});
    } catch (err) {
        console.error("❌ Error al capturar orden:", err.response?.data || err.message);
        res.status(500).json({message: "Error al capturar pago de PayPal"});
    }
});

// BLOQUE PARA GUARDAR VENTA DESPUÉS DE LLENAR DIRECCIÓN
app.post("/api/venta-final", (req, res) => {
    const {id_usuario, direccion} = req.body;

    if (!id_usuario || !direccion) {
        return res.status(400).json({message: "Faltan datos obligatorios"});
    }

    db.query(
        "SELECT * FROM carrito WHERE id_usuario = ? AND id_venta IS NULL",
        [id_usuario],
        (err, productos) => {
            if (err || productos.length === 0) {
                return res.status(500).json({message: "Carrito vacío o error"});
            }

            const total = productos.reduce((acc, p) => acc + parseFloat(p.subtotal), 0);


            const queryVenta = `
                INSERT INTO ventas (id_usuario, monto, calle, numero, colonia, cp, municipio, estado, latitud, longitud,
                                    fecha_hora)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `;


            const d = direccion;
            db.query(
                queryVenta,
                [
                    id_usuario,
                    total,
                    d.calle || "",
                    d.numero || "",
                    d.colonia || "",
                    d.cp || "",
                    d.municipio || "",
                    d.estado || "",
                    d.latitud || null,
                    d.longitud || null,
                ],
                (err, result) => {
                    if (err) {
                        console.error("❌ Error al guardar venta:", err);
                        return res.status(500).json({message: "Error al guardar venta"});
                    }

                    const idVenta = result.insertId;

                    db.query(
                        "UPDATE carrito SET id_venta = ? WHERE id_usuario = ? AND id_venta IS NULL",
                        [idVenta, id_usuario],
                        (err) => {
                            if (err) {
                                console.error("❌ Error al actualizar carrito:", err);
                                return res.status(500).json({message: "Error al actualizar carrito"});
                            }

                            res.json({message: "Venta registrada", id_venta: idVenta});
                        }
                    );
                }
            );
        }
    );
});

//REPORTES
//por dia
app.get("/api/reportes/ventas-dia", (req, res) => {
    const query = `
        SELECT DATE (v.fecha_hora) AS dia, SUM (c.subtotal) AS total
        FROM carrito c
            JOIN ventas v
        ON c.id_venta = v.id
        GROUP BY dia
        ORDER BY dia DESC
            LIMIT 30
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(results.reverse());
    });
});


//por mes
app.get("/api/reportes/ventas-mes", (req, res) => {
    const query = `
        SELECT DATE_FORMAT(v.fecha_hora, '%Y-%m') AS mes, SUM(c.subtotal) AS total
        FROM carrito c
                 JOIN ventas v ON c.id_venta = v.id
        GROUP BY mes
        ORDER BY mes DESC LIMIT 12
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(results.reverse());
    });
});
//REPORTES EN PDF
// EXPORTAR REPORTES DE VENTA POR MES EN PDF
const PDFDocument = require("pdfkit");
const fsExtra = require("fs");

app.get("/api/reportes/ventas-mes/pdf", (req, res) => {
    const query = `
        SELECT DATE_FORMAT(v.fecha_hora, '%Y-%m') AS mes, SUM(c.subtotal) AS total
        FROM carrito c
                 JOIN ventas v ON c.id_venta = v.id
        GROUP BY mes
        ORDER BY mes DESC LIMIT 12
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("❌ Error al generar PDF:", err);
            return res.status(500).json({error: err.message});
        }

        const doc = new PDFDocument();
        const filename = `reporte_ventas_mensual.pdf`;
        const filepath = `./${filename}`;

        doc.pipe(fsExtra.createWriteStream(filepath));

        doc.fontSize(20).text("Reporte de Ventas por Mes", {align: "center"});
        doc.moveDown();

        results.forEach((row) => {
            doc.fontSize(14).text(`Mes: ${row.mes} - Total: $${parseFloat(row.total).toFixed(2)}`);
        });

        doc.end();

        doc.on("finish", () => {
            res.download(filepath, filename, (err) => {
                if (err) console.error("❌ Error al enviar PDF:", err);
                fsExtra.unlinkSync(filepath); // Eliminar el archivo después de enviarlo
            });
        });
    });
});

//mongo DB
// --- Modelo de MongoDB ---

const TemperaturaSchema = new mongoose.Schema({
    temperatura: Number,
    humedad: Number,
    lluvia: Boolean,
    humo: Boolean,
    fecha: {type: Date, default: Date.now}
});

const WorkingModeSchema = new mongoose.Schema({
    is_automatic: Boolean,
    is_up: Boolean,
    is_down: Boolean,
    fecha: {type: Date, default: Date.now}
});
const WorkingMode = mongoose.model("working_mode", WorkingModeSchema);


wss.on('connection', (ws) => {
    console.log("📡 Cliente conectado a WebSocket");

    const intervalId = setInterval(async () => {
        try {
            const lastTemp = await Temperatura.findOne().sort({fecha: -1});
            if (lastTemp) {
                ws.send(JSON.stringify({
                    type: "newTemperature",
                    payload: lastTemp
                }));
            }

            const lastWorkingMode = await WorkingMode.findOne().sort({fecha: -1});
            if (lastWorkingMode) {
                ws.send(JSON.stringify({
                    type: "newWorkingMode",
                    payload: lastWorkingMode
                }));
            }
        } catch (err) {
            console.error("❌ Error en consulta a MongoDB:", err);
        }
    }, 5000);

    ws.on('close', () => {
        console.log("❌ Cliente desconectado");
        clearInterval(intervalId);
    });

    ws.on('error', (err) => {
        console.error("💥 Error en conexión WebSocket:", err);
        clearInterval(intervalId);
    });
});

// --- Guardar datos desde IoT ---
app.post("/api/iot/working-mode", async (req, res) => {
    const {is_automatic, is_up, is_down} = req.body;

    try {
        const nuevoDato = new WorkingMode({is_automatic, is_up, is_down});
        await nuevoDato.save();

        // ⚠️ Emitimos inmediatamente a todos los clientes conectados
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: "newWorkingMode",
                    payload: {
                        is_automatic: is_automatic,
                        is_up: is_up,
                        is_down: is_down,
                        fecha: nuevoDato.fecha
                    }
                }));
            }
        });

        res.json({message: "Datos guardados en MongoDB"});
    } catch (error) {
        console.error("Error al guardar en MongoDB:", error);
        res.status(500).json({message: "Error al guardar en MongoDB"});
    }
});

const Temperatura = mongoose.model("Temperatura", TemperaturaSchema);

// --- Guardar datos desde IoT ---
app.post("/api/iot/temperatura", async (req, res) => {
    const {temperatura, humedad, lluvia, humo} = req.body;

    try {
        const nuevoDato = new Temperatura({temperatura, humedad, lluvia, humo});
        await nuevoDato.save();

        // ⚠️ Emitimos inmediatamente a todos los clientes conectados
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: "newTemperature",
                    payload: {
                        temperatura: temperatura,
                        humedad: humedad,
                        lluvia: lluvia,
                        humo: humo,
                        fecha: nuevoDato.fecha
                    }
                }));
            }
        });

        res.json({message: "Datos guardados en MongoDB"});
    } catch (error) {
        console.error("Error al guardar en MongoDB:", error);
        res.status(500).json({message: "Error al guardar en MongoDB"});
    }
});


// --- Reporte temperatura diaria promedio ---
app.get("/api/reportes/temperatura-dia", async (req, res) => {
    try {
        const datos = await Temperatura.aggregate([
            {
                $group: {
                    _id: {$dateToString: {format: "%Y-%m-%d", date: "$fecha"}},
                    temperatura: {$avg: "$temperatura"},
                },
            },
            {$sort: {_id: -1}},
            {$limit: 30},
        ]);

        const formateado = datos.map((r) => ({
            dia: r._id,
            temperatura: Math.round(r.temperatura * 10) / 10,
        }));

        res.json(formateado.reverse());
    } catch (err) {
        res.status(500).json({error: "Error en el reporte de temperatura"});
    }
});

// --- Reporte humedad diaria promedio ---
app.get("/api/reportes/humedad-dia", async (req, res) => {
    try {
        const datos = await Temperatura.aggregate([
            {
                $group: {
                    _id: {$dateToString: {format: "%Y-%m-%d", date: "$fecha"}},
                    humedad: {$avg: "$humedad"},
                },
            },
            {$sort: {_id: -1}},
            {$limit: 30},
        ]);

        const formateado = datos.map((r) => ({
            dia: r._id,
            humedad: Math.round(r.humedad * 10) / 10,
        }));

        res.json(formateado.reverse());
    } catch (err) {
        res.status(500).json({error: "Error en el reporte de humedad"});
    }
});

// --- Reporte de detecciones de humo o lluvia ---
app.get("/api/reportes/detecciones", async (req, res) => {
    try {
        const datos = await Temperatura.aggregate([
            {
                $project: {
                    fecha: {$dateToString: {format: "%Y-%m-%d", date: "$fecha"}},
                    lluvia: 1,
                    humo: 1
                }
            },
            {
                $group: {
                    _id: "$fecha",
                    lluvias: {$sum: {$cond: ["$lluvia", 1, 0]}},
                    humos: {$sum: {$cond: ["$humo", 1, 0]}}
                }
            },
            {$sort: {_id: -1}},
            {$limit: 30}
        ]);

        res.json(datos.reverse());
    } catch (err) {
        res.status(500).json({error: "Error al obtener reporte de detecciones"});
    }
});

// --- Últimas detecciones (para notificaciones) ---
app.get("/api/notificaciones", async (req, res) => {
    try {
        const ultimos = await Temperatura.find({
            $or: [{lluvia: true}, {humo: true}]
        })
            .sort({fecha: -1})
            .limit(10);

        const mensajes = ultimos.map((d) => ({
            mensaje: d.lluvia ? "🌧️ Lluvia detectada" : d.humo ? "🔥 Humo detectado" : "",
            fecha: d.fecha
        }));

        res.json(mensajes);
    } catch (err) {
        res.status(500).json({error: "Error al obtener notificaciones"});
    }
});

// **Iniciar servidor**
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});