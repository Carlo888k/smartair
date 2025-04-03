import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const API_URL = 'http://localhost:5000';

const Register = () => {
    const [form, setForm] = useState({ apellido: '', nombre: '', correo: '', contrasenia: '' });
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/register`, { ...form, tipo: 'cliente' });
            alert('Usuario registrado con éxito');
            navigate('/login');
        } catch (err) {
            alert('Error en el registro');
            console.error(err);
        }
    };

    return (
        <div className="container">
            <div className="left-panel">
                <div className="logo">Smart Air</div>
            </div>
            <div className="right-panel">
                <h2>Registro</h2>
                <form onSubmit={handleRegister}>
                    <input type="text" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
                    <input type="text" placeholder="Apellido" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} required />
                    <input type="email" placeholder="Correo" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} required />
                    <input type="password" placeholder="Contraseña" value={form.contrasenia} onChange={(e) => setForm({ ...form, contrasenia: e.target.value })} required />
                    <button type="submit">Regístrate</button>
                </form>
                <p>¿Ya tienes cuenta? <a href="/login">Inicia sesión</a></p>
                
            </div>
        </div>
    );
};

export default Register;
