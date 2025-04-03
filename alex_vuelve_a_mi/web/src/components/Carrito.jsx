import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import "./Carrito.css";

const Carrito = () => {
  const navigate = useNavigate();
  const [carrito, setCarrito] = useState([]);
  const [total, setTotal] = useState(0);
  const id_usuario = localStorage.getItem("id_usuario");

  useEffect(() => {
    if (!id_usuario) return;

    axios.get(`http://localhost:5000/api/carrito/${id_usuario}`)
      .then((res) => {
        setCarrito(res.data);
        const totalCalculado = res.data.reduce(
          (acc, item) => acc + parseFloat(item.precio) * item.cantidad,
          0
        );
        setTotal(totalCalculado.toFixed(2));
      })
      .catch((err) => console.error("Error al cargar carrito:", err));
  }, [id_usuario]);

  const eliminarProducto = (id) => {
    axios.delete(`http://localhost:5000/api/carrito/${id}`)
      .then(() => {
        setCarrito((prev) => {
          const nuevoCarrito = prev.filter((item) => item.id !== id);
          const nuevoTotal = nuevoCarrito.reduce(
            (acc, item) => acc + parseFloat(item.precio) * item.cantidad,
            0
          );
          setTotal(nuevoTotal.toFixed(2));
          return nuevoCarrito;
        });
      })
      .catch((err) => console.error("Error al eliminar:", err));
  };

  const capturarPago = async (orderID) => {
    try {
      const res = await axios.post("http://localhost:5000/api/paypal/capture-order", {
        orderID,
        id_usuario,
      });

      if (res.data.message === "Pago capturado con éxito") {
        navigate("/direccion", { state: { total } });
      }
    } catch (err) {
      alert("❌ Error al capturar el pago.");
      console.error(err);
    }
  };

  return (
    <div className="carrito">
      <h2>Mi carrito</h2>

      {carrito.length === 0 ? (
        <p>Tu carrito está vacío.</p>
      ) : (
        <>
          {carrito.map((item) => (
            <div key={item.id} className="carrito-item">
              <div className="carrito-info">
                <strong>{item.nombre}</strong>
                <p>{item.descripcion}</p>
                <p><strong>${item.precio}</strong> / Subtotal: ${item.precio * item.cantidad}</p>
              </div>
              <div className="carrito-cantidad">
                <span>Cantidad: {item.cantidad}</span>
                <button onClick={() => eliminarProducto(item.id)}>Eliminar</button>
              </div>
            </div>
          ))}

          <div className="total">
            <strong>Total: {parseFloat(total).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}</strong>
          </div>

          <PayPalScriptProvider options={{ 
            "client-id": "Af-wBuOlEb53gx86kyGyaYhnse5QN7jR75pU528lIgHtq1SFPJ4DJZ3GgE63qMFsZszp0zTRRU_B-PpE", 
            currency: "MXN" 
          }}>
            <PayPalButtons
              style={{ layout: "vertical", color: "blue" }}
              createOrder={async () => {
                if (!total || parseFloat(total) <= 0) {
                  alert("Total inválido. No se puede crear la orden.");
                  throw new Error("Total inválido");
                }

                try {
                  const res = await axios.post("http://localhost:5000/api/paypal/create-order", {
                    total: parseFloat(total).toFixed(2),
                  });
                  return res.data.id;
                } catch (err) {
                  console.error("❌ Error al crear orden:", err.response?.data || err.message);
                  alert("No se pudo crear la orden de PayPal.");
                  throw err;
                }
              }}
              onApprove={(data) => {
                capturarPago(data.orderID); // solo backend hace capture
              }}
              onError={(err) => {
                console.error("❌ Error en PayPal:", err);
                alert("Ocurrió un error con PayPal");
              }}
            />
          </PayPalScriptProvider>
        </>
      )}

      <div className="acciones">
        <button onClick={() => navigate("/home")} className="regresar-btn">Regresar al home</button>
      </div>
    </div>
  );
};

export default Carrito;
