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
      archivoSection.style.display = 'flex'; // Mostrar sección de archivo
    } else {
      manualSection.classList.add('active');
      archivoSection.classList.remove('active');
      manualBtn.classList.add('active');
      archivoBtn.classList.remove('active');
      archivoSection.style.display = 'none'; // Ocultar sección de archivo
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
  const cuerpoTexto = document.getElementById('cuerpoTexto');
  const emisorDiv = document.getElementById('emisorCorreo');
  const emisorTexto = document.getElementById('emisorTexto');
  const respuestaDiv = document.getElementById('respuestaIA');

  if (!input.files || input.files.length === 0) {
    alert("Por favor seleccioná un archivo .eml");
    return;
  }

  const archivo = input.files[0];
  const lector = new FileReader();

  lector.onload = function (e) {
    const raw = e.target.result;

    // Extraer emisor
    const fromMatch = raw.match(/^From:\s*(.*)$/mi);
    let nombreEmisor = "";
    let emailEmisor = "";

    if (fromMatch) {
      const from = fromMatch[1].trim();

      // Expresión regular para separar nombre y mail
      const datosMatch = from.match(/^(.*?)(?:\s*<([^>]+)>)$/);

      if (datosMatch) {
        nombreEmisor = datosMatch[1].trim();      // → "Matias de Buren"
        emailEmisor = datosMatch[2].trim();       // → "matias.de.buren@gmail.com"
      } else {
        // En caso de que venga solo el mail sin nombre
        emailEmisor = from;
      }
    }

    if (fromMatch) {
      emisorDiv.style.display = "block";
      emisorTexto.textContent = nombreEmisor + emailEmisor;
    } else {
      emisorDiv.style.display = "block";
      emisorTexto.textContent = "No se pudo identificar el emisor.";
    }

    // Extraer boundary
    const boundaryMatch = raw.match(/boundary="([^"]+)"/i);
    if (!boundaryMatch) {
      contenedor.style.display = "block";
      cuerpoTexto.textContent = "No se encontró boundary en el correo.";
      return;
    }
    const boundary = boundaryMatch[1];
    const delimiter = "--" + boundary;

    const parts = raw.split(delimiter);

    // Buscar parte text/plain
    let plainPart = null;
    for (let part of parts) {
      if (/Content-Type:\s*text\/plain/i.test(part)) {
        plainPart = part;
        break;
      }
    }

    if (!plainPart) {
      contenedor.style.display = "block";
      cuerpoTexto.textContent = "No se encontró cuerpo de texto plano en el correo.";
      return;
    }

    // Extraer cuerpo
    const bodyMatch = plainPart.match(/\r?\n\r?\n([\s\S]*)/);
    let body = bodyMatch ? bodyMatch[1].trim() : "";
    body = decodeQuotedPrintable(body);

    // Mostrar cuerpo
    contenedor.style.display = "block";
    cuerpoTexto.textContent = body || "No se encontró contenido en texto plano.";

    // Simular respuesta IA
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
  