import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from "./components/Login.jsx";
import Register from "./components/Register.jsx";
import Home from "./components/Home.jsx";
import HomeAdmin from "./components/HomeAdmin.jsx";
import GestionProductos from './components/GestionProductos.jsx';
import GestionEmpleados from './components/GestionEmpleados.jsx';
import ProductCard from './components/ProductCard.jsx'
import Carrito from './components/Carrito.jsx';
import Direccion from "./components/Direccion";
import Reportes from './components/Reportes.jsx';
import Confirmacion from './components/Confirmacion.jsx';



function App() {
    const [token, setToken] = useState(localStorage.getItem('token') || '');

    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login setToken={setToken} />} />
                <Route path="/register" element={<Register />} />
                <Route path="/homeadmin" element={<HomeAdmin />} />
                <Route path="/home" element={<Home />} />
                <Route path="/GestionProductos" element={<GestionProductos />} />
                <Route path='/GestionEmpleados' element={<GestionEmpleados/>}/>
                <Route path='/ProductCard' element={<ProductCard/>}/>
                <Route path='/Carrito' element={<Carrito/>}/>
                <Route path="/carrito" element={<Carrito />} />
                <Route path="/direccion" element={<Direccion />} />
                <Route path="/direccion" element={<Direccion />} />
                <Route path="/Reportes" element={<Reportes />} />
                <Route path="/Confirmacion" element={<Confirmacion/>}/>
                <Route path="*" element={<Login setToken={setToken} />} />
            </Routes>
        </Router>
    );
}

export default App;
