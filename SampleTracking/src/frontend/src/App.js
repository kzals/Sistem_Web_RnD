import React, { useEffect, useState } from "react";

function App() {
  const [espStatus, setEspStatus] = useState({});
  const [lampCode1, setLampCode1] = useState("");
  const [lampCode2, setLampCode2] = useState("");
  const [message, setMessage] = useState("");

  const BACKEND_URL = "http://localhost:8000";

  // ============================
  // CEK STATUS BOARD
  // ============================
  const checkEspStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/esp-status`);
      const data = await res.json();
      setEspStatus(data || {});
    } catch {
      setEspStatus({});
    }
  };

  useEffect(() => {
    checkEspStatus();
    const interval = setInterval(checkEspStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // ============================
  // VALIDASI FORMAT
  // ============================
  const isValidLampCode = (code) => {
    if (!code) return true; // kosong boleh
    const pattern = /^(\d)(\d)([A-D])$/;
    if (!pattern.test(code)) return false;
    const lemari = Number(code[0]);
    const rak = Number(code[1]);
    return lemari >= 1 && lemari <= 5 && rak >= 1 && rak <= 8;
  };

  // ============================
  // KIRIM 2 PERINTAH SEKALIGUS
  // ============================
  const sendMultipleCommand = async () => {
    if (!lampCode1 && !lampCode2) {
      setMessage("Minimal isi salah satu lampu");
      return;
    }

    if (!isValidLampCode(lampCode1) || !isValidLampCode(lampCode2)) {
      setMessage("Format harus seperti 11A, 21A, atau 31A");
      return;
    }

    const commands = [];

    if (lampCode1) {
      commands.push(
        fetch(`${BACKEND_URL}/api/lampu`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lamp: lampCode1,
            state: 1,
          }),
        })
      );
    }

    if (lampCode2) {
      commands.push(
        fetch(`${BACKEND_URL}/api/lampu`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lamp: lampCode2,
            state: 1,
          }),
        })
      );
    }

    try {
      await Promise.all(commands);
      setMessage("Perintah berhasil dikirim");
      setLampCode1("");
      setLampCode2("");
    } catch {
      setMessage("Gagal mengirim salah satu perintah");
    }
  };

  return (
    <div style={styles.container}>
      <h1>Smart Lamp Controller</h1>

      {/* STATUS BOARD */}
      <div style={styles.statusBox}>
        <h3>Status ESP per Lemari:</h3>

        {[1, 2, 3, 4, 5].map((lemari) => {
          const key = `LEMARI_${lemari}`;
          const isOnline = Boolean(espStatus?.[key]?.online);
          return (
            <div key={key}>
              <b>Lemari {lemari} : </b>
              <span style={{ color: isOnline ? "green" : "red" }}>
                {isOnline ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
          );
        })}
      </div>

      {/* CONTROL */}
      <div style={styles.controlBox}>
        <h3>Kontrol 2 Lampu Sekaligus</h3>

        <input
          type="text"
          value={lampCode1}
          onChange={(e) => setLampCode1(e.target.value.toUpperCase())}
          placeholder="Lampu 1 (contoh: 11A)"
          style={styles.input}
        />

        <input
          type="text"
          value={lampCode2}
          onChange={(e) => setLampCode2(e.target.value.toUpperCase())}
          placeholder="Lampu 2 (contoh: 31A)"
          style={styles.input}
        />

        <div style={{ fontSize: "14px", marginBottom: "10px" }}>
          <div>Format: <b>[Lemari][Rak][Posisi]</b> (contoh 11A, 21A, 31A)</div>
          <div>Lemari 1-5, Rak 1-8, Posisi A-D</div>
        </div>

        <button
          onClick={sendMultipleCommand}
          style={{ ...styles.button, backgroundColor: "green" }}
        >
          ON
        </button>

        {message && <p style={{ marginTop: "15px" }}>{message}</p>}
      </div>
    </div>
  );
}

const styles = {
  container: {
    textAlign: "center",
    marginTop: "60px",
    fontFamily: "Arial",
  },
  statusBox: {
    marginBottom: "40px",
  },
  controlBox: {
    marginTop: "20px",
  },
  input: {
    padding: "10px",
    fontSize: "16px",
    marginBottom: "15px",
    width: "220px",
    textAlign: "center",
    display: "block",
    margin: "10px auto",
  },
  button: {
    padding: "10px 25px",
    fontSize: "16px",
    color: "white",
    border: "none",
    cursor: "pointer",
    borderRadius: "5px",
  },
};

export default App;