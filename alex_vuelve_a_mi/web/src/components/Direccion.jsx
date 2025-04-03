import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Direccion.css";

const GOOGLE_API_KEY = "TU_API_KEY_GOOGLE_MAPS";

const Direccion = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const total = state?.total || 0;
  const id_usuario = localStorage.getItem("id_usuario");

  const [modo, setModo] = useState("");
  const [coords, setCoords] = useState({ latitud: "", longitud: "" });
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [direccion, setDireccion] = useState({
    calle: "",
    numero: "",
    colonia: "",
    cp: "",
    municipio: "",
    estado: "",
  });

  const obtenerUbicacion = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoords({ latitud: lat, longitud: lng });
        setMostrarMapa(true);
        setModo("gps");

        try {
          const res = await axios.get(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`
          );

          const result = res.data.results[0];

          if (result) {
            const components = result.address_components;
            const getComponent = (types) =>
              components.find((c) => types.every((t) => c.types.includes(t)))?.long_name || "";

            setDireccion({
              calle: getComponent(["route"]),
              numero: getComponent(["street_number"]),
              colonia: getComponent(["sublocality", "sublocality_level_1"]),
              cp: getComponent(["postal_code"]),
              municipio: getComponent(["locality"]),
              estado: getComponent(["administrative_area_level_1"]),
            });
          }
        } catch (error) {
          console.error("Error al obtener dirección por coordenadas:", error);
        }
      });
    } else {
      alert("Tu navegador no soporta geolocalización");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDireccion({ ...direccion, [name]: value });
  };

  const guardarVenta = async () => {
    try {
      const payload = {
        id_usuario,
        direccion: {
          calle: direccion.calle,
          numero: direccion.numero,
          colonia: direccion.colonia,
          cp: direccion.cp,
          municipio: direccion.municipio,
          estado: direccion.estado,
          latitud: modo === "gps" ? coords.latitud : null,
          longitud: modo === "gps" ? coords.longitud : null,
        },
      };

      const res = await axios.post("http://localhost:5000/api/venta-final", payload);

      if (res.data.message === "Venta registrada") {
        navigate("/confirmacion", {
          state: {
            direccion: payload.direccion,
            total,
          },
        });
      } else {
        alert("No se pudo guardar la dirección");
      }
    } catch (err) {
      console.error("❌ Error al guardar venta:", err);
      alert("Ocurrió un error al registrar la dirección");
    }
  };

  return (
    <div className="direccion-page">
      <h2>Confirmar dirección de entrega</h2>

      <div className="botones-modo">
        <button onClick={obtenerUbicacion}>📍 Usar ubicación actual</button>
        <button onClick={() => setModo("manual")}>✍️ Escribir dirección manual</button>
      </div>

      {modo === "gps" && mostrarMapa && coords.latitud && coords.longitud && (
        <div className="map-container">
          <iframe
            title="Ubicación actual"
            width="100%"
            height="300"
            frameBorder="0"
            style={{ border: 0 }}
            src={`https://www.google.com/maps/embed/v1/view?key=${GOOGLE_API_KEY}&center=${coords.latitud},${coords.longitud}&zoom=17&maptype=roadmap`}
            allowFullScreen
          ></iframe>
        </div>
      )}

      {(modo === "manual" || modo === "gps") && (
        <div className="formulario-direccion">
          <input name="calle" placeholder="Calle" value={direccion.calle} onChange={handleInputChange} />
          <input name="numero" placeholder="Número" value={direccion.numero} onChange={handleInputChange} />
          <input name="colonia" placeholder="Colonia" value={direccion.colonia} onChange={handleInputChange} />
          <input name="cp" placeholder="Código Postal" value={direccion.cp} onChange={handleInputChange} />
          <input name="municipio" placeholder="Municipio" value={direccion.municipio} onChange={handleInputChange} />
          <input name="estado" placeholder="Estado" value={direccion.estado} onChange={handleInputChange} />
        </div>
      )}

      {modo && (
        <>
          <p>
            <strong>Total:</strong>{" "}
            {parseFloat(total).toLocaleString("es-MX", {
              style: "currency",
              currency: "MXN",
            })}
          </p>
          <button onClick={guardarVenta} className="btn-confirmar">
            ✅ Confirmar dirección
          </button>
        </>
      )}
    </div>
  );
};

export default Direccion;
