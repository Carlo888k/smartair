import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./GestionEmpleados.css";
import { FaTrash, FaEdit } from "react-icons/fa";

function GestionEmpleados() {
  const navigate = useNavigate();
  const [empleados, setEmpleados] = useState([]);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({
    id: null,
    nombre: "",
    correo: "",
    NumSer: "",
    contrasenia: "",
  });
  const [editingEmpleados, setEditingEmpleados] = useState(false);
  const [activeTab, setActiveTab] = useState("empleado");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/login");
    fetchEmpleados();
  }, [navigate]);

  const fetchEmpleados = async () => {
    try {
      const id_cliente = localStorage.getItem("id_cliente");
  
      if (!id_cliente) {
        console.error("⚠️ ID del cliente no encontrado. ¿Iniciaste sesión?");
        return;
      }
  
      const res = await axios.get(`http://localhost:5000/empleados/${id_cliente}`);
      setEmpleados(res.data);
    } catch (error) {
      console.error("Error al obtener empleados:", error);
    }
  };
  
  const handleAddOrUpdate = async () => {
    try {
      setErrorMsg("");
  
      const id_cliente = parseInt(localStorage.getItem("id_cliente"));
  
      if (!id_cliente) {
        setErrorMsg("Error: ID del cliente no encontrado. ¿Iniciaste sesión?");
        return;
      }
  
      const formDataToSend = {
        nombre: formData.nombre,
        correo: formData.correo,
        NumSer: formData.NumSer,
        contrasenia: formData.contrasenia,
        id_cliente,
      };
  

      if (editingEmpleados && formData.id) {
        await axios.put(
          `http://localhost:5000/empleados/${formData.id}`,
          formDataToSend
        );
        setEditingEmpleados(false);
      } else {
        await axios.post("http://localhost:5000/empleados", formDataToSend);
      }

      setFormData({ id: null, nombre: "", correo: "", NumSer: "", contrasenia: "" });
      setActiveTab("empleado");
      fetchEmpleados();
    } catch (error) {
      if (error.response?.data?.error) {
        setErrorMsg(error.response.data.error);
      } else {
        setErrorMsg("Error al agregar/modificar empleado.");
        console.error(error);
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/empleados/${id}`);
      fetchEmpleados();
    } catch (error) {
      console.error("Error al eliminar empleado:", error);
    }
  };

  const handleEdit = (empleado) => {
    setFormData({ id: empleado.id, nombre: empleado.nombre, correo: empleado.correo, NumSer: empleado.NumSer, contrasenia: "" });
    setEditingEmpleados(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div style={{ display: "flex" }}>
      <aside className="sidebar">
        <h2>Smart Air</h2>
        <nav>
          <button onClick={() => navigate("/Home")}>🏠 Home</button>
          <button onClick={() => navigate("/GestionEmpleados")}>👨‍💼 Gestión de empleados</button>
          <button onClick={handleLogout}>🚪 Salir</button>
        </nav>
      </aside>

      <main className="main">
        <div className="top-nav">
          <button className={activeTab === "empleado" ? "active" : ""} onClick={() => setActiveTab("empleado")}>Empleado</button>
          <button className={activeTab === "buscar" ? "active" : ""} onClick={() => setActiveTab("buscar")}>Buscar Empleado</button>
          <button className={activeTab === "modificar" ? "active" : ""} onClick={() => setActiveTab("modificar")}>Modificar Empleado</button>
          <button className={activeTab === "eliminar" ? "active" : ""} onClick={() => setActiveTab("eliminar")}>Eliminar Empleado</button>
        </div>

        {activeTab === "empleado" && (
          <div className="form-wrapper">
            <h3>Registro de Empleados</h3>
            <div className="form-container">
              <input type="text" placeholder="Nombre" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
              <input type="email" placeholder="Correo" value={formData.correo} onChange={(e) => setFormData({ ...formData, correo: e.target.value })} />
              <input type="text" placeholder="Número de Serie" value={formData.NumSer} onChange={(e) => setFormData({ ...formData, NumSer: e.target.value })} />
              <input type="password" placeholder="Contraseña" value={formData.contrasenia} onChange={(e) => setFormData({ ...formData, contrasenia: e.target.value })} />
              <button onClick={handleAddOrUpdate}>Registrar Empleado</button>
              {errorMsg && <p style={{ color: "red", marginTop: "10px" }}>{errorMsg}</p>}
            </div>
          </div>
        )}

        {activeTab === "buscar" && (
          <div className="buscar-container">
            <h3>Buscar empleado</h3>
            <input type="text" placeholder="Buscar empleado..." value={search} onChange={(e) => setSearch(e.target.value)} className="search-box" />
            <table className="tabla-empleados">
              <thead>
                <tr><th>Nombre</th><th>Correo</th><th>Núm. Serie</th></tr>
              </thead>
              <tbody>
                {empleados.filter((emp) => emp.nombre.toLowerCase().includes(search.toLowerCase())).map((empleado) => (
                  <tr key={empleado.id}><td>{empleado.nombre}</td><td>{empleado.correo}</td><td>{empleado.NumSer}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "modificar" && (
          <div className="modificar-container">
            <h3>Modificar empleado</h3>
            {!editingEmpleados ? (
              <table className="tabla-empleados">
                <thead>
                  <tr><th>Nombre</th><th>Correo</th><th>Núm. Serie</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {empleados.map((empleado) => (
                    <tr key={empleado.id}>
                      <td>{empleado.nombre}</td>
                      <td>{empleado.correo}</td>
                      <td>{empleado.NumSer}</td>
                      <td><button className="action-button" onClick={() => handleEdit(empleado)}><FaEdit /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="form-container">
                <input type="text" placeholder="Nombre" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
                <input type="email" placeholder="Correo" value={formData.correo} onChange={(e) => setFormData({ ...formData, correo: e.target.value })} />
                <input type="text" placeholder="Número de Serie" value={formData.NumSer} onChange={(e) => setFormData({ ...formData, NumSer: e.target.value })} />
                <input type="password" placeholder="Contraseña" value={formData.contrasenia} onChange={(e) => setFormData({ ...formData, contrasenia: e.target.value })} />
                <button onClick={handleAddOrUpdate}>Actualizar Empleado</button>
                {errorMsg && <p style={{ color: "red", marginTop: "10px" }}>{errorMsg}</p>}
              </div>
            )}
          </div>
        )}

        {activeTab === "eliminar" && (
          <div className="eliminar-container">
            <h3>Borrar Empleado</h3>
            <table className="tabla-empleados">
              <thead>
                <tr><th>Nombre</th><th>Correo</th><th>Núm. Serie</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {empleados.map((empleado) => (
                  <tr key={empleado.id}>
                    <td>{empleado.nombre}</td>
                    <td>{empleado.correo}</td>
                    <td>{empleado.NumSer}</td>
                    <td><button className="delete-button" onClick={() => handleDelete(empleado.id)}><FaTrash /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default GestionEmpleados;
