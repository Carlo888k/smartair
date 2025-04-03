import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Confirmacion.css";

const Confirmacion = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const direccion = state?.direccion || {};
  const total = state?.total || 0;

  return (
    <div className="confirmacion-page">
      <h2>✅ ¡Compra confirmada!</h2>

      <div className="info-envio">
        <h4>📦 Detalles del envío:</h4>
        <p><strong>Calle:</strong> {direccion.calle}</p>
        <p><strong>Número:</strong> {direccion.numero}</p>
        <p><strong>Colonia:</strong> {direccion.colonia}</p>
        <p><strong>Código Postal:</strong> {direccion.cp}</p>
        <p><strong>Municipio:</strong> {direccion.municipio}</p>
        <p><strong>Estado:</strong> {direccion.estado}</p>
        {direccion.latitud && direccion.longitud && (
          <p><strong>Ubicación GPS:</strong> {direccion.latitud}, {direccion.longitud}</p>
        )}
      </div>

      <h4>Total pagado: {parseFloat(total).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
      })}</h4>

      <button onClick={() => navigate("/home")} className="btn-home">
        🏠 Volver al inicio
      </button>
    </div>
  );
};

export default Confirmacion;