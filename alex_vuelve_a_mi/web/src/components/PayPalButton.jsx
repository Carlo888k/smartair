import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const PayPalButton = ({ total, id_usuario }) => {
  const navigate = useNavigate();

  const createOrder = async () => {
    const res = await axios.post("http://localhost:5000/api/paypal/create-order", { total });
    return res.data.id;
  };

  const onApprove = async (data) => {
    const res = await axios.post("http://localhost:5000/api/paypal/capture-order", {
      orderID: data.orderID,
      id_usuario,
    });

    if (res.data.message === "Pago capturado con éxito") {
      navigate("/direccion", { state: { id_usuario } });
    }
  };

  return (
    <PayPalScriptProvider options={{ "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID }}>
      <PayPalButtons
        style={{ layout: "horizontal" }}
        createOrder={() => createOrder()}
        onApprove={(data) => onApprove(data)}
      />
    </PayPalScriptProvider>
  );
};

export default PayPalButton;
