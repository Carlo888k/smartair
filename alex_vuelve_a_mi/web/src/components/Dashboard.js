import React, { useState, useEffect } from "react";
import axios from "axios";

function Dashboard({ setIsLoggedIn }) {
  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState({
    id: null,
    apellido: "",
    nombre: "",
    contrasenia: "",
    correo: "",
    tipo: "cliente",
    NumSer: ""
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await axios.get("http://localhost:5000/usuarios");
      setClients(res.data);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("userSession");
    setIsLoggedIn(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await axios.put(`http://localhost:5000/usuarios/${formData.id}`, formData);
        setIsEditing(false);
      } else {
        await axios.post("http://localhost:5000/usuarios", formData);
      }
      setFormData({ id: null, apellido: "", nombre: "", contrasenia: "", correo: "", tipo: "cliente", NumSer: "" });
      fetchClients();
    } catch (error) {
      console.error("Error al guardar usuario:", error);
    }
  };

  const handleEdit = (client) => {
    setFormData(client);
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/usuarios/${id}`);
      fetchClients();
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
    }
  };

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h2>Gestión de Usuarios</h2>
      <button onClick={handleLogout} style={{ background: "red", color: "white", padding: "10px" }}>
        Cerrar Sesión
      </button>

      <form onSubmit={handleSubmit} style={{ maxWidth: "500px", margin: "auto", textAlign: "left" }}>
        <h3>Formulario de Usuario</h3>
        <input type="text" name="apellido" placeholder="Apellido" value={formData.apellido} onChange={handleChange} required />
        <input type="text" name="nombre" placeholder="Nombre" value={formData.nombre} onChange={handleChange} required />
        <input type="password" name="contrasenia" placeholder="Contraseña" value={formData.contrasenia} onChange={handleChange} required />
        <input type="email" name="correo" placeholder="Correo Electrónico" value={formData.correo} onChange={handleChange} required />
        <select name="tipo" value={formData.tipo} onChange={handleChange} required>
          <option value="cliente">Cliente</option>
          <option value="admin">Admin</option>
          <option value="empleado">Empleado</option>
        </select>
        <input type="text" name="NumSer" placeholder="Número de Serie" value={formData.NumSer} onChange={handleChange} />
        <button type="submit" style={{ padding: "10px 20px", background: "blue", color: "white" }}>
          {isEditing ? "Guardar cambios" : "Agregar usuario"}
        </button>
      </form>

      <h3>Lista de Usuarios</h3>
      {clients.length === 0 ? (
        <p>No hay usuarios registrados.</p>
      ) : (
        <table style={{ width: "100%", maxWidth: "800px", margin: "auto", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Apellido</th>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Tipo</th>
              <th>Número de Serie</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td>{client.apellido}</td>
                <td>{client.nombre}</td>
                <td>{client.correo}</td>
                <td>{client.tipo}</td>
                <td>{client.NumSer}</td>
                <td>
                  <button onClick={() => handleEdit(client)}>Editar</button>
                  <button onClick={() => handleDelete(client.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Dashboard;
