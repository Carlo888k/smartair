import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

const API_URL = "http://localhost:5000";
const clientId = "724657925373-1hbosuhpubg13k4uo2b72dkc096dha28.apps.googleusercontent.com";

const Login = ({ setToken }) => {
    const [loginData, setLoginData] = useState({ correo: "", contrasenia: "" });
    const [error, setError] = useState("");
    const navigate = useNavigate();

    // Función de inicio de sesión con correo y contraseña
    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
      
        console.log("🟢 Datos enviados desde el frontend:", loginData);
      
        try {
          const res = await axios.post(`${API_URL}/login`, loginData);
          const { token, tipo, id } = res.data; // ← recién acá existe `id`
      
          setToken(token);
          localStorage.setItem("token", token);
          localStorage.setItem("id_cliente", id); // ✅ Ahora sí, `id` existe
      
          if (tipo === "admin") {
            navigate("/homeadmin");
          } else {
            navigate("/home");
          }
        } catch {
          setError("Correo o contraseña incorrectos");
        }
      };
      

    // Función para manejar el inicio de sesión con Google
    const handleGoogleLoginSuccess = async (credentialResponse) => {
        console.log("🟢 Inicio de sesión exitoso con Google:", credentialResponse);

        try {
            const res = await axios.post(`${API_URL}/google-login`, {
                token: credentialResponse.credential, // Enviamos el ID Token de Google al backend
            });

            const { token, tipo, id } = res.data;

            setToken(token);
            localStorage.setItem("token", token);
            localStorage.setItem("id_usuario", id);
            localStorage.setItem("id_cliente", id); // 👈 Cambiá esto

            if (tipo === "admin") {
                navigate("/homeadmin");
            } else {
                navigate("/home");
            }
        } catch {
            setError("Error al iniciar sesión con Google");
        }
    };

    return (
        <div className="container">
            <div className="left-panel">
                <div className="logo">Smart Air</div>
            </div>
            <div className="right-panel">
                <h2>Inicio de Sesión</h2>
                {error && <p className="error">{error}</p>}
                <form onSubmit={handleLogin}>
                    <input
                        type="email"
                        placeholder="Correo"
                        value={loginData.correo}
                        onChange={(e) => setLoginData({ ...loginData, correo: e.target.value })}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Contraseña"
                        value={loginData.contrasenia}
                        onChange={(e) => setLoginData({ ...loginData, contrasenia: e.target.value })}
                        required
                    />
                    <button type="submit">Iniciar Sesión</button>
                </form>
                <p>¿No tienes cuenta? <a href="/register">Regístrate</a></p>
                <GoogleOAuthProvider clientId={clientId}>
                    <div>
                        <h2>O inicia sesión con Google</h2>
                        <GoogleLogin
                            onSuccess={handleGoogleLoginSuccess}
                            onError={() => console.log("❌ Error en inicio de sesión con Google")}
                        />
                    </div>
                </GoogleOAuthProvider>
            </div>
        </div>
    );
};

export default Login;
