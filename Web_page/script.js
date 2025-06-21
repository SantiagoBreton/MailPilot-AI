// Cambiar entre modo subir archivo o escribir mensaje
function cambiarModo(modo) {
    const archivoSection = document.getElementById('modoArchivo');
    const manualSection = document.getElementById('modoManual');
    const archivoBtn = document.getElementById('modoArchivoBtn');
    const manualBtn = document.getElementById('modoManualBtn');
  
    if (modo === 'archivo') {
      archivoSection.classList.add('active');
      manualSection.classList.remove('active');
      archivoBtn.classList.add('active');
      manualBtn.classList.remove('active');
    } else {
      manualSection.classList.add('active');
      archivoSection.classList.remove('active');
      manualBtn.classList.add('active');
      archivoBtn.classList.remove('active');
    }
  }
  
  // Función para decodificar quoted-printable
  function decodeQuotedPrintable(input) {
    return input
      .replace(/=\r?\n/g, '') // elimina saltos forzados por = al final de línea
      .replace(/=([A-Fa-f0-9]{2})/g, function (match, p1) {
        return String.fromCharCode(parseInt(p1, 16));
      });
  }
  
  // Leer archivo .eml, extraer texto plano y mostrarlo
  function leerCorreo() {
    const input = document.getElementById('archivoCorreo');
    const contenedor = document.getElementById('contenidoCorreo');
    const respuestaDiv = document.getElementById('respuestaIA');
  
    if (!input.files || input.files.length === 0) {
      alert("Por favor seleccioná un archivo .eml");
      return;
    }
  
    const archivo = input.files[0];
    const lector = new FileReader();
  
    lector.onload = function (e) {
      const raw = e.target.result;
  
      // Extraemos el boundary
      const boundaryMatch = raw.match(/boundary="([^"]+)"/i);
      if (!boundaryMatch) {
        contenedor.style.display = "block";
        contenedor.innerText = "No se encontró boundary en el correo.";
        return;
      }
      const boundary = boundaryMatch[1];
  
      // Construimos el delimitador para separar partes
      const delimiter = "--" + boundary;
  
      // Separamos el mail en partes usando el boundary
      const parts = raw.split(delimiter);
  
      // Buscamos la parte text/plain
      let plainPart = null;
      for (let part of parts) {
        if (/Content-Type:\s*text\/plain/i.test(part)) {
          plainPart = part;
          break;
        }
      }
  
      if (!plainPart) {
        contenedor.style.display = "block";
        contenedor.innerText = "No se encontró cuerpo de texto plano en el correo.";
        return;
      }
  
      // Extraemos el cuerpo (contenido después de doble salto de línea)
      const bodyMatch = plainPart.match(/\r?\n\r?\n([\s\S]*)/);
      let body = bodyMatch ? bodyMatch[1].trim() : "";
  
      // Decodificamos quoted-printable
      body = decodeQuotedPrintable(body);
  
      // Mostramos contenido del correo
      contenedor.style.display = "block";
      contenedor.innerText = body || "No se encontró contenido en texto plano.";
  
      // Simulamos respuesta IA con el contenido leído
      respuestaDiv.style.display = "block";
      respuestaDiv.innerHTML = "Procesando respuesta generada por IA...";
      setTimeout(() => {
        respuestaDiv.innerHTML = `Respuesta generada por IA (simulada):<br><br>Gracias por tu correo. Hemos recibido el siguiente contenido:<br><br><pre>${body}</pre>`;
      }, 1500);
    };
  
    lector.onerror = function () {
      alert("Error al leer el archivo.");
    };
  
    lector.readAsText(archivo);
  }
  
  // Enviar mensaje manual y simular respuesta IA
  function enviarMensaje() {
    const mensaje = document.getElementById('mensaje').value;
    const respuestaDiv = document.getElementById('respuestaIA');
  
    if (!mensaje.trim()) {
      alert("Por favor escribí un mensaje.");
      return;
    }
  
    respuestaDiv.style.display = "block";
    respuestaDiv.innerHTML = "Procesando...";
  
    setTimeout(() => {
      respuestaDiv.innerHTML = `Respuesta generada por IA (simulada):<br><br>Gracias por tu mensaje. En breve te responderemos con más detalles.`;
    }, 1500);
  }
  