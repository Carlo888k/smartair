import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./HomeAdmin.css";

function HomeAdmin() {
  const navigate = useNavigate();
  
  // Lista de clientes
  const [clients, setClients] = useState([]);
  // Búsqueda
  const [search, setSearch] = useState("");
  // Para la edición
  const [editingClientId, setEditingClientId] = useState(null);
  const [editedData, setEditedData] = useState({
    nombre: "",
    correo: "",
    contrasenia: ""
  });

  // Pestaña activa: "cliente", "buscar", "modificar", "borrar"
  const [activeTab, setActiveTab] = useState("cliente");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
    fetchClients();
  }, [navigate]);

  // Obtener todos los clientes
  const fetchClients = async () => {
    try {
      const res = await axios.get("http://localhost:5000/clientes");
      setClients(res.data);
    } catch (error) {
      console.error("Error al obtener clientes:", error);
    }
  };

  // Búsqueda
  const handleSearch = (event) => {
    setSearch(event.target.value);
  };

  // Filtro para la pestaña "buscar"
  const filteredClients = clients.filter(
    (client) =>
      client.nombre.toLowerCase().includes(search.toLowerCase()) ||
      client.correo.toLowerCase().includes(search.toLowerCase())
  );

  // Para "modificar"
  const handleEditClick = (client) => {
    setEditingClientId(client.id);
    setEditedData({
      nombre: client.nombre,
      correo: client.correo,
      contrasenia: "" // vacío para ingresar nueva contraseña si se desea
    });
  };

  const handleSaveChanges = async (id) => {
    try {
      await axios.put(`http://localhost:5000/clientes/${id}`, editedData);
      setEditingClientId(null);
      fetchClients();
    } catch (error) {
      console.error("Error al modificar cliente:", error);
    }
  };

  // Para "borrar"
  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/clientes/${id}`);
      fetchClients();
    } catch (error) {
      console.error("Error al eliminar cliente:", error);
    }
  };

  // Cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="admin-container">
      {/* BARRA LATERAL */}
      <aside className="sidebar">
        <h2>SmartAir</h2>
        <nav>
          <button onClick={() => navigate("/HomeAdmin")}>gestión de cliente</button>
          <button onClick={() => navigate("/GestionProductos")}>gestión de producto</button>
          <button onClick={() => navigate("/Reportes")}>reportes</button>
        </nav>
        <button className="logout" onClick={handleLogout}>salir</button>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <div className="content">
        {/* BARRA SUPERIOR DE “PESTAÑAS” */}
        <div className="navbar">
          <button
            className={activeTab === "cliente" ? "active" : ""}
            onClick={() => {
              setActiveTab("cliente");
              setEditingClientId(null);
            }}
          >
            cliente
          </button>
          <button
            className={activeTab === "buscar" ? "active" : ""}
            onClick={() => {
              setActiveTab("buscar");
              setEditingClientId(null);
            }}
          >
            buscar cliente
          </button>
          <button
            className={activeTab === "modificar" ? "active" : ""}
            onClick={() => {
              setActiveTab("modificar");
              setEditingClientId(null);
            }}
          >
            modificar cliente
          </button>
          <button
            className={activeTab === "borrar" ? "active" : ""}
            onClick={() => {
              setActiveTab("borrar");
              setEditingClientId(null);
            }}
          >
            borrar cliente
          </button>
        </div>

        {/* TAB 1: CLIENTE - mostrar tabla de clientes (sin formulario) */}
        {activeTab === "cliente" && (
          <div>
            <h3>Clientes</h3>
            <table>
              <thead>
                <tr>
                  <th>Id</th>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Contraseña</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan="4">No hay clientes registrados.</td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr key={client.id}>
                      <td>{client.id}</td>
                      <td>{client.nombre}</td>
                      <td>{client.correo}</td>
                      <td>******</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: BUSCAR CLIENTE */}
        {activeTab === "buscar" && (
          <div>
            <h3>Buscar Cliente</h3>
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={search}
              onChange={handleSearch}
              className="search-box"
            />
            <table>
              <thead>
                <tr>
                  <th>Id</th>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Contraseña</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan="4">No hay clientes que coincidan.</td>
                  </tr>
                ) : (
                  filteredClients.map((client) => (
                    <tr key={client.id}>
                      <td>{client.id}</td>
                      <td>{client.nombre}</td>
                      <td>{client.correo}</td>
                      <td>******</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: MODIFICAR CLIENTE */}
        {activeTab === "modificar" && (
          <div>
            <h3>Modificar Cliente</h3>
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Contraseña</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan="4">No hay clientes registrados.</td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr key={client.id}>
                      {editingClientId === client.id ? (
                        // Modo edición
                        <>
                          <td>
                            <input
                              type="text"
                              value={editedData.nombre}
                              onChange={(e) =>
                                setEditedData({ ...editedData, nombre: e.target.value })
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="email"
                              value={editedData.correo}
                              onChange={(e) =>
                                setEditedData({ ...editedData, correo: e.target.value })
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="password"
                              placeholder="Nueva contraseña"
                              value={editedData.contrasenia}
                              onChange={(e) =>
                                setEditedData({
                                  ...editedData,
                                  contrasenia: e.target.value,
                                })
                              }
                            />
                          </td>
                          <td>
                            <button onClick={() => handleSaveChanges(client.id)}>
                              confirmar
                            </button>
                          </td>
                        </>
                      ) : (
                        // Vista normal
                        <>
                          <td>{client.nombre}</td>
                          <td>{client.correo}</td>
                          <td>******</td>
                          <td>
                            <button onClick={() => handleEditClick(client)}>✏️</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: BORRAR CLIENTE */}
        {activeTab === "borrar" && (
          <div>
            <h3>Borrar Cliente</h3>
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Contraseña</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan="4">No hay clientes registrados.</td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr key={client.id}>
                      <td>{client.nombre}</td>
                      <td>{client.correo}</td>
                      <td>******</td>
                      <td>
                        <button
                          className="delete-button"
                          onClick={() => handleDelete(client.id)}
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

export default HomeAdmin;
