  import React, { useEffect, useState } from 'react';
  import axios from 'axios';
  import './Home.css';
  import { useNavigate } from 'react-router-dom';

  const Home = () => {
    const navigate = useNavigate();
    const [productos, setProductos] = useState([]);
    const [error, setError] = useState(null); // para mostrar errores

    useEffect(() => {
      const token = localStorage.getItem('token');

      if (!token) {
        console.warn("❌ No hay token, redirigiendo al login...");
        navigate('/login');
        return;
      }

      console.log("🔐 Token usado:", token);

      axios.get('http://localhost:5000/api/productos', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      .then(response => {
        console.log("✅ Productos cargados:", response.data);
        setProductos(response.data);
      })
      .catch(error => {
        console.error('❌ Error al obtener productos:', error);
        setError('No se pudieron cargar los productos.');
      });
    }, [navigate]);

    const agregarAlCarrito = async (producto) => {
      const id_usuario = localStorage.getItem('id_usuario');
      const cantidad = 1;
    
      if (producto.stock <= 0) {
        alert("Este producto no tiene stock disponible.");
        return;
      }
    
      if (!id_usuario) {
        alert("No se pudo identificar al usuario. Inicia sesión nuevamente.");
        return;
      }
    
      const subtotal = producto.precio * cantidad;
    
      try {
        const res = await axios.post("http://localhost:5000/api/carrito", {
          id_usuario,
          id_prod: producto.id,
          cantidad,
          subtotal,
        });
    
        alert("✅ Producto agregado al carrito");
    
        // 🔁 Refrescar productos desde backend para evitar que se altere el stock en pantalla
        const token = localStorage.getItem("token");
        const prodRes = await axios.get('http://localhost:5000/api/productos', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProductos(prodRes.data);
    
      } catch (error) {
        if (error.response?.data?.error === "Este producto ya está en tu carrito.") {
          alert("⚠️ Este producto ya fue agregado al carrito.");
        } else {
          console.error("❌ Error al agregar al carrito:", error);
          alert("No se pudo agregar al carrito");
        }
      }
    };
    

    return (
      <div style={{ display: 'flex' }}>
        <aside className="sidebar">
          <h2>Smart Air</h2>
          <nav>
            <a href="/Home">🏠 Home</a>
            <a href="/GestionEmpleados">👨‍💼 Gestión de empleados</a>
            <a href="/Carrito">🛒 Carrito</a>
            <a href="/login">🚪 Salir</a>
          </nav>
        </aside>

        <main className="main">
          <header className="header">
            <h2>Productos</h2>
          </header>

          <section className="welcome-section">
            <div className="image-placeholder"></div>
            <div className="text">
              <h2>Bienvenido a Smart Air</h2>
              <p>
                En nuestra tienda creemos en el poder de la tecnología para mejorar tu entorno. 
                Con Smart Air podrás mantener tu espacio cómodo y moderno, controlando el clima 
                con sistemas inteligentes y productos de alta calidad.
              </p>
            </div>
          </section>

          <section className="products">
            {error ? (
              <p style={{ color: "red" }}>{error}</p>
            ) : productos.length === 0 ? (
              <p>Cargando productos...</p>
            ) : (
              productos.map((prod) => (
                <div key={prod.id} className="product-card">
                  <span className="new-tag">NEW PRODUCT</span>
                  <img
                    src={`http://localhost:5000${prod.imagen}`}
                    alt={prod.nombre}
                    onError={(e) => e.target.src = "/default-image.png"} // por si no hay imagen
                  />
                  <h4>{prod.nombre}</h4>
                  <p>{prod.descripcion}</p>
                  <p>Precio: ${prod.precio}</p>
                  <p>{prod.stock} en stock</p>
                  <button onClick={() => agregarAlCarrito(prod)}>Agregar al carrito</button>
                </div>
              ))
            )}
          </section>
        </main>
      </div>
    );
  };

  export default Home;
