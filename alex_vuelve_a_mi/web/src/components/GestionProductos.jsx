import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./gestionproductos.css";

function GestionProductos() {
  const navigate = useNavigate();
  const [productos, setProductos] = useState([]);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({
    id: null,
    nombre: "",
    descripcion: "",
    precio: "",
    stock: "",
    imagen: null,
    imagenUrl: "",
  });
  const [editingProduct, setEditingProduct] = useState(false);

  // Para manejar cuál pestaña está activa: 'producto', 'buscar', 'modificar', 'eliminar'
  const [activeTab, setActiveTab] = useState("producto");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
    fetchProductos();
  }, [navigate]);

  const fetchProductos = async () => {
    try {
      const res = await axios.get("http://localhost:5000/productos");
      setProductos(res.data);
    } catch (error) {
      console.error("Error al obtener productos:", error);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  // Filtrado por nombre y/o descripción
  const filteredProductos = productos.filter(
    (prod) =>
      prod.nombre.toLowerCase().includes(search.toLowerCase()) ||
      prod.descripcion.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (producto) => {
    setActiveTab("modificar");
    setEditingProduct(true);
    setFormData({
      id: producto.id,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      precio: producto.precio,
      stock: producto.stock,
      imagen: null,
      imagenUrl: producto.imagen || "",
    });
  };

  const handleAddOrUpdate = async () => {
    try {
      const fd = new FormData();
      fd.append("nombre", formData.nombre);
      fd.append("descripcion", formData.descripcion);
      fd.append("precio", formData.precio);
      fd.append("stock", formData.stock);

      if (formData.imagen) {
        // Nueva imagen
        fd.append("imagen", formData.imagen);
      } else {
        // Ruta o campo sin cambios
        fd.append("imagenUrl", formData.imagenUrl);
      }

      if (editingProduct && formData.id) {
        // Editar
        await axios.put(
          `http://localhost:5000/productos/${formData.id}`,
          fd,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
        setEditingProduct(false);
      } else {
        // Nuevo producto
        await axios.post("http://localhost:5000/productos", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      // Limpiar formulario
      setFormData({
        id: null,
        nombre: "",
        descripcion: "",
        precio: "",
        stock: "",
        imagen: null,
        imagenUrl: "",
      });
      setActiveTab("producto");
      fetchProductos();
    } catch (error) {
      console.error("Error al agregar/modificar producto:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/productos/${id}`);
      fetchProductos();
    } catch (error) {
      console.error("Error al eliminar producto:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="admin-container">
      {/* Barra lateral izquierda */}
      <aside className="sidebar">
        <h2>SmartAir</h2>
        <nav className="side-menu">
          <button onClick={() => navigate("/HomeAdmin")}>Gestión de clientes</button>
          <button onClick={() => navigate("/GestionProductos")}>Gestión de productos</button>
          <button onClick={() => navigate("/Reportes")}>Reportes</button>
        </nav>
        <button className="logout" onClick={handleLogout}>Salir</button>
      </aside>

      {/* Contenido principal */}
      <div className="content">
        {/* Barra superior con “pestañas” */}
        <div className="top-nav">
          <button
            className={activeTab === "producto" ? "active" : ""}
            onClick={() => {
              setActiveTab("producto");
              setEditingProduct(false);
              setFormData({
                id: null,
                nombre: "",
                descripcion: "",
                precio: "",
                stock: "",
                imagen: null,
                imagenUrl: "",
              });
            }}
          >
            Producto
          </button>
          <button
            className={activeTab === "buscar" ? "active" : ""}
            onClick={() => setActiveTab("buscar")}
          >
            Buscar producto
          </button>
          <button
            className={activeTab === "modificar" ? "active" : ""}
            onClick={() => setActiveTab("modificar")}
          >
            Modificar producto
          </button>
          <button
            className={activeTab === "eliminar" ? "active" : ""}
            onClick={() => setActiveTab("eliminar")}
          >
            Eliminar producto
          </button>
        </div>

        {/* VISTA 1: REGISTRO DE PRODUCTO */}
        {activeTab === "producto" && (
          <div className="form-wrapper">
            <h3>registro de Producto</h3>
            <div className="form-container">
              <input
                type="text"
                placeholder="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
              <input
                type="text"
                placeholder="Descripción"
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
              />
              <input
                type="number"
                placeholder="Precio"
                value={formData.precio}
                onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
              />
              <input
                type="number"
                placeholder="Stock"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setFormData({ ...formData, imagen: e.target.files[0] })
                }
              />

              <button onClick={handleAddOrUpdate}>
                Registrar producto
              </button>
            </div>
          </div>
        )}

        {/* VISTA 2: BUSCAR PRODUCTO (tabla con buscador) */}
        {activeTab === "buscar" && (
          <div className="buscar-container">
            <h3>Buscar producto</h3>
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={handleSearch}
              className="search-box"
            />
            <table className="tabla-productos">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Precio</th>
                  <th>Descripción</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {filteredProductos.length === 0 ? (
                  <tr>
                    <td colSpan="5">No hay productos que coincidan.</td>
                  </tr>
                ) : (
                  filteredProductos.map((p) => (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>{p.nombre}</td>
                      <td>${p.precio}</td>
                      <td>{p.descripcion}</td>
                      <td>{p.stock}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* VISTA 3: MODIFICAR PRODUCTO (tabla con ícono de editar) */}
        {activeTab === "modificar" && (
          <div className="modificar-container">
            <h3>Modificar producto</h3>
            {/* Al hacer clic en ✏️ se rellena el formulario (ver handleEdit) */}
            <table className="tabla-productos">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Precio</th>
                  <th>Descripción</th>
                  <th>Stock</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.length === 0 ? (
                  <tr>
                    <td colSpan="6">No hay productos registrados.</td>
                  </tr>
                ) : (
                  productos.map((p) => (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>{p.nombre}</td>
                      <td>${p.precio}</td>
                      <td>{p.descripcion}</td>
                      <td>{p.stock}</td>
                      <td>
                        <button onClick={() => handleEdit(p)}>✏️</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Si se ha seleccionado un producto para editar, aparece el formulario */}
            {editingProduct && (
              <div className="form-container" style={{ marginTop: "20px" }}>
                <h4>Modificar Producto (ID: {formData.id})</h4>
                <input
                  type="text"
                  placeholder="Nombre"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                />
                <input
                  type="text"
                  placeholder="Descripción"
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData({ ...formData, descripcion: e.target.value })
                  }
                />
                <input
                  type="number"
                  placeholder="Precio"
                  value={formData.precio}
                  onChange={(e) =>
                    setFormData({ ...formData, precio: e.target.value })
                  }
                />
                <input
                  type="number"
                  placeholder="Stock"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: e.target.value })
                  }
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setFormData({ ...formData, imagen: e.target.files[0] })
                  }
                />

                {formData.imagenUrl && !formData.imagen && (
                  <img
                    src={`http://localhost:5000${formData.imagenUrl}`}
                    alt="Producto Actual"
                    style={{ width: "80px", margin: "10px 0" }}
                  />
                )}

                <button onClick={handleAddOrUpdate}>Guardar Cambios</button>
              </div>
            )}
          </div>
        )}

        {/* VISTA 4: ELIMINAR PRODUCTO (tabla con ícono de eliminar) */}
        {activeTab === "eliminar" && (
          <div className="eliminar-container">
            <h3>Eliminar producto</h3>
            <table className="tabla-productos">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Precio</th>
                  <th>Descripción</th>
                  <th>Stock</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.length === 0 ? (
                  <tr>
                    <td colSpan="6">No hay productos registrados.</td>
                  </tr>
                ) : (
                  productos.map((p) => (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>{p.nombre}</td>
                      <td>${p.precio}</td>
                      <td>{p.descripcion}</td>
                      <td>{p.stock}</td>
                      <td>
                        <button
                          className="delete-button"
                          onClick={() => handleDelete(p.id)}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default GestionProductos;
