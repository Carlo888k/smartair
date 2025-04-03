import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import io from "socket.io-client";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, ChartDataLabels);

const Reportes = () => {
  const navigate = useNavigate();
  const [ventasDia, setVentasDia] = useState([]);
  const [ventasMes, setVentasMes] = useState([]);
  const [temperaturaActual, setTemperaturaActual] = useState(null);
  const [notificaciones, setNotificaciones] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/login");

    const fetchData = () => {
      fetch("http://localhost:5000/api/reportes/ventas-dia")
        .then(res => res.json())
        .then(setVentasDia);

      fetch("http://localhost:5000/api/reportes/ventas-mes")
        .then(res => res.json())
        .then(setVentasMes);

      fetch("http://localhost:5000/api/notificaciones")
        .then(res => res.json())
        .then(setNotificaciones);
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [navigate]);

  useEffect(() => {
    const socket = io("http://localhost:5000");

    socket.on("newTemperature", (data) => {
      setTemperaturaActual(data);

      if (data.humo || data.lluvia) {
        const mensaje = data.humo ? "🔥 Humo detectado" : "🌧️ Lluvia detectada";
        setNotificaciones(prev => [{ mensaje, fecha: new Date() }, ...prev.slice(0, 9)]);
      }
    });

    return () => socket.disconnect();
  }, []);

  const panelStyle = {
    backgroundColor: "#fff",
    padding: "1rem",
    borderRadius: "10px",
    boxShadow: "0 0 5px rgba(0,0,0,0.1)",
    marginBottom: "1.5rem",
    width: "100%",
    maxWidth: "500px",
  };

  const chartOptions = {
    responsive: true,
    indexAxis: 'y',
    plugins: {
      datalabels: {
        color: '#000',
        anchor: 'center',
        align: 'center',
        font: { weight: 'bold', size: 16 }
      },
      legend: { display: false },
    },
    scales: {
      x: { min: 0, max: 100 },
    },
  };

  const verticalOptions = {
    responsive: true,
    indexAxis: 'x',
    plugins: {
      datalabels: {
        color: '#000',
        anchor: 'end',
        align: 'center',
        font: { weight: 'bold', size: 16 }
      },
      legend: { display: false },
    },
    scales: {
      y: { min: 0, max: 100 },
    },
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: "220px", background: "#f0f0f0", padding: "2rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <h2>SmartAir</h2>
          <button style={navBtn} onClick={() => navigate("/HomeAdmin")}>Clientes</button>
          <button style={navBtn} onClick={() => navigate("/GestionProductos")}>Productos</button>
          <button style={{ ...navBtn, backgroundColor: "#00c0d6", color: "#fff" }}>Reportes</button>
        </div>
        <button style={logoutBtnStyle} onClick={() => { localStorage.removeItem("token"); navigate("/login"); }}>Salir</button>
      </aside>

      <main style={{ flex: 1, padding: "2rem", display: "flex", flexWrap: "wrap", gap: "2rem", justifyContent: "center" }}>
        <div style={panelStyle}>
          <h3>🗓️ Ventas por Día</h3>
          <Bar data={{
            labels: ventasDia.map(d => d.dia),
            datasets: [{ label: "Ventas ($)", data: ventasDia.map(d => d.total), backgroundColor: "#00c0d6" }]
          }} options={verticalOptions} />
        </div>

        <div style={panelStyle}>
          <h3>📅 Ventas por Mes</h3>
          <Bar data={{
            labels: ventasMes.map(d => d.mes),
            datasets: [{ label: "Ventas ($)", data: ventasMes.map(d => d.total), backgroundColor: "#ff6384" }]
          }} options={verticalOptions} />
        </div>

        {temperaturaActual && (
          <>
            <div style={panelStyle}>
              <h3>🌡️ Temperatura</h3>
              <Bar data={{
                labels: ["Temperatura"],
                datasets: [{
                  label: "Temp",
                  data: [temperaturaActual.temperatura],
                  backgroundColor: "#36a2eb"
                }]
              }} options={verticalOptions} />
            </div>

            <div style={panelStyle}>
              <h3>💧 Humedad</h3>
              <Bar data={{
                labels: ["Humedad"],
                datasets: [{
                  label: "Humedad",
                  data: [temperaturaActual.humedad],
                  backgroundColor: "#4bc0c0"
                }]
              }} options={verticalOptions} />
            </div>

            <div style={panelStyle}>
              <h3>🔥 Humo</h3>
              <Bar data={{
                labels: ["Humo"],
                datasets: [{
                  label: "Humo",
                  data: [temperaturaActual.humo ? 100 : 0],
                  backgroundColor: "#ff9f40"
                }]
              }} options={verticalOptions} />
            </div>

            <div style={panelStyle}>
              <h3>🌧️ Lluvia</h3>
              <Bar data={{
                labels: ["Lluvia"],
                datasets: [{
                  label: "Lluvia",
                  data: [temperaturaActual.lluvia ? 100 : 0],
                  backgroundColor: "#36a2eb"
                }]
              }} options={verticalOptions} />
            </div>
          </>
        )}

        <div style={panelStyle}>
          <h3>🔔 Notificaciones</h3>
          <ul>
            {notificaciones.map((n, i) => (
              <li key={i}>{n.mensaje} - {new Date(n.fecha).toLocaleString()}</li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
};

const navBtn = {
  display: "block",
  width: "100%",
  padding: "0.75rem",
  marginBottom: "1rem",
  border: "none",
  borderRadius: "5px",
  background: "#dcdcdc",
  fontWeight: "bold",
  cursor: "pointer",
  textAlign: "left",
};

const logoutBtnStyle = {
  backgroundColor: "#ff4d4d",
  color: "#fff",
  border: "none",
  padding: "0.75rem",
  borderRadius: "5px",
  fontWeight: "bold",
  cursor: "pointer",
  width: "100%",
};

export default Reportes;
