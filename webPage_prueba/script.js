function cambiarModo(modo) {
  const archivo = document.getElementById('modoArchivo');
  const manual = document.getElementById('modoManual');
  const archivoBtn = document.getElementById('modoArchivoBtn');
  const manualBtn = document.getElementById('modoManualBtn');

  if (modo === 'archivo') {
    archivo.classList.add('active');
    manual.classList.remove('active');
    archivoBtn.classList.add('active');
    manualBtn.classList.remove('active');
  } else {
    archivo.classList.remove('active');
    manual.classList.add('active');
    archivoBtn.classList.remove('active');
    manualBtn.classList.add('active');
  }
}

async function enviarMensaje() {
  const mensaje = document.getElementById('mensaje').value;
  const respuestaDiv = document.getElementById('respuestaIA');

  if (!mensaje.trim()) {
    alert("Por favor escribí un mensaje.");
    return;
  }

  respuestaDiv.style.display = "block";
  respuestaDiv.innerHTML = "Procesando respuesta...";

  try {
    const res = await fetch("http://localhost:5000/responder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenidoCorreo: mensaje })
    });

    const data = await res.json();

    if (data.respuesta) {
      respuestaDiv.innerHTML = `Respuesta generada por IA:<br><br>${data.respuesta.replace(/\n/g, '<br>')}`;
    } else if (data.error) {
      respuestaDiv.innerHTML = `Error: ${data.error}`;
    } else {
      respuestaDiv.innerHTML = "No se recibió una respuesta válida.";
    }
  } catch (err) {
    respuestaDiv.innerHTML = "Error al conectar con la IA.";
    console.error(err);
  }
}

