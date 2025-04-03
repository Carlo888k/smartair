// ProductCard.jsx
import React from "react";
import "./ProductCard.css";

const ProductCard = ({ producto, agregarAlCarrito }) => {
  return (
    <div className="card-producto">
      <div className="nuevo-producto">NEW PRODUCT</div>
      <img src={producto.imagen} alt={producto.nombre} />
      <h3>{producto.nombre}</h3>
      <p>{producto.ventanas}</p>
      <button onClick={() => agregarAlCarrito(producto)}>Agregar al carrito</button>
    </div>
  );
};

export default ProductCard;
