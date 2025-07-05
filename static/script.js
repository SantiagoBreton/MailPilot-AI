// Cambiar entre modo subir archivo o escribir mensaje
function cambiarModo(modo) {
  const archivoSection = document.getElementById('modoArchivo');
  const manualSection = document.getElementById('modoManual');
  const archivoBtn = document.getElementById('modoArchivoBtn');
  const manualBtn = document.getElementById('modoManualBtn');
  document.getElementById("btnCopiar").style.display = "none";


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

  // Limpiar la respuesta al cambiar de modo
  const respuestaDiv = document.getElementById('respuestaIA');
  respuestaDiv.innerHTML = '';
}

function cambiarSeccion(seccion) {
  const tabs = document.querySelectorAll('.seccion-tab');
  const btns = document.querySelectorAll('.tab-btn');

  // Oculta todas las secciones
  tabs.forEach(tab => tab.classList.remove('activa'));
  btns.forEach(btn => btn.classList.remove('active'));

  // Muestra la sección activa
  document.getElementById(`seccion-${seccion}`).classList.add('activa');
  event.target.classList.add('active');

  // Oculta las secciones internas de la otra pestaña
  if (seccion === "responder") {
    document.getElementById("modoArchivo").style.display = "flex";
    document.getElementById("modoManual").style.display = "none";
    document.getElementById("modoArchivo").classList.add("active");
    document.getElementById("modoManual").classList.remove("active");
  } else if (seccion === "resumir") {
    document.getElementById("modoArchivo").style.display = "none";
    document.getElementById("modoManual").style.display = "none";
  }

  // Limpiar respuesta
  document.getElementById("respuestaIA").style.display = "none";
  document.getElementById("btnCopiar").style.display = "none";
}


// Función para decodificar quoted-printable
function decodeQuotedPrintable(input) {
  return input
    .replace(/=\r?\n/g, '') // elimina saltos forzados por = al final de línea
    .replace(/=([A-Fa-f0-9]{2})/g, function (match, p1) {
      return String.fromCharCode(parseInt(p1, 16));
    });
}

// Leer archivo .eml, extraer texto plano y llamar a la IA
function leerCorreo() {
  const input = document.getElementById('archivoCorreoSimple');
  const respuestaDiv = document.getElementById('respuestaIA');

  if (!input.files || input.files.length === 0) {
    alert("Por favor seleccioná un archivo .eml");
    return;
  }

  const archivo = input.files[0];
  const lector = new FileReader();

  lector.onload = function (e) {
    const raw = e.target.result;

    // Extraer emisor (podés usarlo si querés)
    const fromMatch = raw.match(/^From:\s*(.*)$/mi);
    if (fromMatch) {
      const from = fromMatch[1].trim();
      const datosMatch = from.match(/^(.*?)(?:\s*<([^>]+)>)$/);
      if (datosMatch) {
        nombreEmisor = datosMatch[1].trim();
        emailEmisor = datosMatch[2].trim();
      } else {
        emailEmisor = from;
      }
    }

    // Extraer boundary
    const boundaryMatch = raw.match(/boundary="([^"]+)"/i);
    if (!boundaryMatch) {
      alert("No se encontró boundary en el correo.");
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
      alert("No se encontró cuerpo de texto plano en el correo.");
      return;
    }

    // Extraer cuerpo y decodificar
    const bodyMatch = plainPart.match(/\r?\n\r?\n([\s\S]*)/);
    let body = bodyMatch ? bodyMatch[1].trim() : "";
    body = decodeQuotedPrintable(body);

    if (!body) {
      alert("No se encontró contenido en texto plano.");
      return;
    }

    // Mostrar "Procesando" y llamar IA
    respuestaDiv.style.display = "block";
    respuestaDiv.innerHTML = "Procesando respuesta generada por IA...";

    enviarMensaje2(body);
  };

  lector.onerror = function () {
    alert("Error al leer el archivo.");
  };

  lector.readAsText(archivo);
}

// Enviar texto a backend para obtener respuesta IA
async function enviarMensaje2(texto) {
  const respuestaDiv = document.getElementById('respuestaIA');

  try {
    const res = await fetch("http://localhost:5000/responderMailSimple", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ contenidoCorreo: texto })
    });

    const data = await res.json();

    if (data.respuesta) {
      respuestaDiv.innerHTML = `${data.respuesta.replace(/\n/g, '<br>')}`;
      respuestaDiv.style.display = "block";
      document.getElementById("btnCopiar").style.display = "inline-block";
      respuestaDiv.setAttribute("contenteditable", "true");
    }
    else if (data.error) {
      respuestaDiv.innerHTML = `Error: ${data.error}`;
    } else {
      respuestaDiv.innerHTML = "No se recibió una respuesta válida.";
      respuestaDiv.style.display = "block";
      respuestaDiv.setAttribute("contenteditable", "false");
    }
  } catch (err) {
    respuestaDiv.innerHTML = "Error al conectar con la IA.";
    console.error(err);
  }
}

// Enviar mensaje manual
async function enviarMensaje() {
  const mensaje = document.getElementById('mensaje').value.trim();
  const respuestaDiv = document.getElementById('respuestaIA');

  if (!mensaje) {
    alert("Por favor escribí un mensaje.");
    return;
  }

  respuestaDiv.style.display = "block";
  respuestaDiv.innerHTML = "Procesando respuesta...";

  try {
    const res = await fetch("http://localhost:5000/responderMailSimple", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ contenidoCorreo: mensaje })
    });

    const data = await res.json();

    if (data.respuesta) {
      respuestaDiv.innerHTML = `${data.respuesta.replace(/\n/g, '<br>')}`;
      respuestaDiv.style.display = "block";
      document.getElementById("btnCopiar").style.display = "inline-block";
      respuestaDiv.setAttribute("contenteditable", "true");
    }
    else if (data.error) {
      respuestaDiv.innerHTML = `Error: ${data.error}`;
    } else {
      respuestaDiv.innerHTML = "No se recibió una respuesta válida.";
      respuestaDiv.style.display = "block";
      respuestaDiv.setAttribute("contenteditable", "false");
    }
  } catch (err) {
    respuestaDiv.innerHTML = "Error al conectar con la IA.";
    console.error(err);
  }
}
function editarRespuesta() {
  const div = document.getElementById('respuestaIA');
  const textarea = document.getElementById('respuestaEditable');

  textarea.value = div.innerText || div.textContent;
  textarea.style.display = 'block';
}
function copiarRespuesta() {
  const respuestaDiv = document.getElementById("respuestaIA");
  const texto = respuestaDiv.innerText || respuestaDiv.textContent;

  if (!texto.trim()) {
    mostrarMensaje("No hay respuesta para copiar.");
    return;
  }

  navigator.clipboard.writeText(texto)
    .then(() => {
      mostrarMensaje("¡Respuesta copiada al portapapeles!");
    })
    .catch(err => {
      console.error("Error al copiar: ", err);
      mostrarMensaje("No se pudo copiar la respuesta.");
    });
}

// Función para mostrar el mensaje flotante
function mostrarMensaje(texto) {
  const mensaje = document.getElementById("mensajeCopiado");
  mensaje.textContent = texto;
  mensaje.classList.add("visible");

  // Ocultar después de 2.5 segundos
  setTimeout(() => {
    mensaje.classList.remove("visible");
  }, 2500);
}

async function resumir() {
  const input = document.getElementById("archivoCorreoMultiples");
  const respuestaDiv = document.getElementById("respuestaIA");
  const btnCopiar = document.getElementById("btnCopiar");

  if (!input.files || input.files.length === 0) {
    alert("Seleccioná al menos un archivo .eml");
    return;
  }

  respuestaDiv.style.display = "block";
  respuestaDiv.innerHTML = "Procesando resumen generado por IA...";

  const correos = [];

  const procesarArchivo = (archivo) => {
    return new Promise((resolve) => {
      const lector = new FileReader();
      lector.onload = function (e) {
        const raw = e.target.result;

        // Extraer emisor
        const fromMatch = raw.match(/^From:\s*(.*)$/mi);
        let emisor = "Desconocido";
        if (fromMatch) {
          const datosMatch = fromMatch[1].trim().match(/^(.*?)(?:\s*<([^>]+)>)$/);
          emisor = datosMatch ? (datosMatch[1] || datosMatch[2]) : fromMatch[1].trim();
        }

        // Boundary
        const boundaryMatch = raw.match(/boundary="([^"]+)"/i);
        if (!boundaryMatch) return resolve(null);

        const parts = raw.split("--" + boundaryMatch[1]);
        let plainPart = null;
        for (let part of parts) {
          if (/Content-Type:\s*text\/plain/i.test(part)) {
            plainPart = part;
            break;
          }
        }

        if (!plainPart) return resolve(null);

        const bodyMatch = plainPart.match(/\r?\n\r?\n([\s\S]*)/);
        let cuerpo = bodyMatch ? bodyMatch[1].trim() : "";
        cuerpo = decodeQuotedPrintable(cuerpo);

        if (cuerpo) {
          correos.push({ emisor, cuerpo });
        }
        resolve();
      };
      lector.onerror = () => resolve(null);
      lector.readAsText(archivo);
    });
  };

  // Procesar todos los archivos secuencialmente
  for (const archivo of input.files) {
    await procesarArchivo(archivo);
  }

  try {
    const res = await fetch("http://localhost:5000/resumirCorreos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ correos })
    });

    const data = await res.json();

    if (data.resumenes) {
      let html = "";
      for (const [emisor, resumen] of Object.entries(data.resumenes)) {
        html += `<strong>${emisor}</strong><br>${resumen.replace(/\n/g, "<br>")}<br><br>`;
      }
      respuestaDiv.innerHTML = html;
      respuestaDiv.setAttribute("contenteditable", "true");
      btnCopiar.style.display = "inline-block";
    } else {
      respuestaDiv.innerHTML = "No se recibió un resumen válido.";
    }
  } catch (err) {
    respuestaDiv.innerHTML = "Error al conectar con el servidor.";
    console.error(err);
  }
}

async function clasificar() {
  const input = document.getElementById('archivoClasificar');
  const respuestaDiv = document.getElementById('respuestaIA');
  const btnCopiar = document.getElementById("btnCopiar");

  respuestaDiv.style.display = 'block';
  btnCopiar.style.display = "none";
  respuestaDiv.innerHTML = "Procesando clasificación...";

  if (!input.files || input.files.length === 0) {
    alert("Por favor seleccioná al menos un archivo .eml.");
    return;
  }

  const archivos = input.files;
  const correosProcesados = [];

  for (let archivo of archivos) {
    const contenido = await archivo.text();

    // Extraer emisor
    const fromMatch = contenido.match(/^From:\s*(.*)$/mi);
    const from = fromMatch ? fromMatch[1].trim() : "Desconocido";

    // Extraer body plano
    const boundaryMatch = contenido.match(/boundary="([^"]+)"/i);
    if (!boundaryMatch) continue;
    const boundary = boundaryMatch[1];
    const parts = contenido.split("--" + boundary);
    const part = parts.find(p => /Content-Type:\s*text\/plain/i.test(p));
    if (!part) continue;
    const bodyMatch = part.match(/\r?\n\r?\n([\s\S]*)/);
    let body = bodyMatch ? bodyMatch[1].trim() : "";
    body = decodeQuotedPrintable(body);

    correosProcesados.push({ remitente: from, contenido: body });
  }

  try {
    const res = await fetch("http://localhost:5000/clasificarMails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ correos: correosProcesados })
    });

    const data = await res.json();
    if (!data.clasificados) {
      respuestaDiv.innerHTML = "No se pudo procesar la clasificación.";
      return;
    }

    // Generar HTML agrupado con colores y secciones colapsables
    let html = "";
    const colores = {
      "URGENTE": "#ff4d4f",
      "MUY IMPORTANTE": "#ffa940",
      "IMPORTANTE": "#1890ff",
      "NO PRIORITARIO": "#52c41a",
      "INNECESARIO RESPONDER": "#fadb14",
      "OTROS": "#8c8c8c"
    };

    for (const prioridad of ["URGENTE", "MUY IMPORTANTE", "IMPORTANTE", "NO PRIORITARIO", "INNECESARIO RESPONDER", "OTROS"]) {
      const grupo = data.clasificados[prioridad];
      if (grupo.length === 0) continue;

      html += `
    <details open class="grupo-prioridad" data-prioridad="${prioridad}">
      <summary>
        ${prioridad} (${grupo.length})
      </summary>
      <ul>
  `;

      for (const item of grupo) {
        html += `
      <li>
        <strong>${item.remitente}:</strong> ${item.resumen}
        ${item.fecha_mencionada ? `<em> (fecha: ${item.fecha_mencionada})</em>` : ""}
      </li>
    `;
      }

      html += `</ul></details>`;
    }

    respuestaDiv.innerHTML = html;
    respuestaDiv.setAttribute("contenteditable", "true");
    btnCopiar.style.display = "inline-block";

  } catch (err) {
    console.error(err);
    respuestaDiv.innerHTML = "Error al conectar con la IA.";
  }
}


// script.js

document.addEventListener('DOMContentLoaded', () => {
  // Login button click
  document.getElementById('btnLogin').addEventListener('click', () => {
    window.location.href = 'http://localhost:5000/login';
  });
});

// Fetch and display emails
async function obtenerCorreos() {
  const contenedor = document.getElementById('contenedorCorreos');
  contenedor.innerHTML = "Cargando correos...";

  try {
    const res = await fetch('http://localhost:5000/listar-correos', {
      method: 'GET',
      credentials: 'include'
    });

    if (res.status === 401) {
      contenedor.innerHTML = "No estás autenticado. Por favor inicia sesión primero.";
      return;
    }

    if (!res.ok) {
      contenedor.innerHTML = "Error al obtener correos.";
      return;
    }

    const correos = await res.json();

    if (!correos.length) {
      contenedor.innerHTML = "No hay correos para mostrar.";
      return;
    }

    let html = '';
    correos.forEach(mail => {
      html += `
        <div class="correo" style="margin-bottom:10px;">
          <input type="checkbox" class="checkbox-correo" value="${mail.id}" style="margin-right: 10px;">
          <strong>De:</strong> ${mail.remitente} <br/>
          <strong>Asunto:</strong> ${mail.asunto}
        </div>
      `;
    });

    contenedor.innerHTML = html;

  } catch (error) {
    contenedor.innerHTML = "Error en la comunicación con el servidor.";
    console.error(error);
  }
}


async function accionarCorreos(tipo) {
  const seleccionados = [...document.querySelectorAll('.checkbox-correo:checked')];
  if (seleccionados.length === 0) {
    alert("Seleccioná al menos un correo.");
    return;
  }

  const ids = seleccionados.map(cb => cb.value);

  // Obtener todos los correos mostrados
  const todos = await fetch("http://localhost:5000/listar-correos", {
    credentials: "include"
  });
  const correos = await todos.json();

  // Filtrar los seleccionados
  const seleccionadosInfo = correos.filter(c => ids.includes(c.id));

  // Elegir endpoint según tipo
  let endpoint = "";
  if (tipo === "responder") endpoint = "responderMailSimple";
  if (tipo === "resumir") endpoint = "resumirCorreos";
  if (tipo === "clasificar") endpoint = "clasificarMails";

  const respuestaDiv = document.getElementById("respuestaIA");
  respuestaDiv.innerHTML = "Procesando...";
  respuestaDiv.style.display = "block";
  console.log("Contenido a enviar:", seleccionadosInfo[0].contenido);


  try {
    const res = await fetch(`http://localhost:5000/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(
        tipo === "resumir"
          ? { correos: seleccionadosInfo.map(c => ({ emisor: c.remitente, cuerpo: c.contenido })) }
          : tipo === "clasificar"
            ? { correos: seleccionadosInfo.map(c => ({ remitente: c.remitente, contenido: c.contenido })) }
            : { contenidoCorreo: seleccionadosInfo[0].contenido } // responderMailSimple solo usa uno
      )
    });

    const data = await res.json();
    if (data.respuesta) {
      respuestaDiv.innerHTML = `${data.respuesta.replace(/\n/g, '<br>')}`;
      respuestaDiv.style.display = "block";
      document.getElementById("btnCopiar").style.display = "inline-block";
      respuestaDiv.setAttribute("contenteditable", "true");

    } else if (data.resumenes) {
      let html = "";
      for (const [emisor, resumen] of Object.entries(data.resumenes)) {
        html += `<strong>${emisor}</strong><br>${resumen.replace(/\n/g, "<br>")}<br><br>`;
      }
      respuestaDiv.innerHTML = html;
      respuestaDiv.setAttribute("contenteditable", "true");
      document.getElementById("btnCopiar").style.display = "inline-block";

    } else if (data.clasificados) {
      const colores = {
        "URGENTE": "#ff4d4f",
        "MUY IMPORTANTE": "#ffa940",
        "IMPORTANTE": "#1890ff",
        "NO PRIORITARIO": "#52c41a",
        "INNECESARIO RESPONDER": "#fadb14",
        "OTROS": "#8c8c8c"
      };

      let html = "";

      for (const prioridad of ["URGENTE", "MUY IMPORTANTE", "IMPORTANTE", "NO PRIORITARIO", "INNECESARIO RESPONDER", "OTROS"]) {
        const grupo = data.clasificados[prioridad];
        if (grupo.length === 0) continue;

        html += `<details open class="grupo-prioridad" data-prioridad="${prioridad}">
      <summary>${prioridad} (${grupo.length})</summary>
      <ul>`;

        for (const item of grupo) {
          html += `<li><strong>${item.remitente}:</strong> ${item.resumen}`;
          if (item.fecha_mencionada) {
            html += ` <em>(fecha: ${item.fecha_mencionada})</em>`;
          }
          html += `</li>`;
        }

        html += `</ul></details>`;
      }

      respuestaDiv.innerHTML = html;
      respuestaDiv.setAttribute("contenteditable", "true");
      document.getElementById("btnCopiar").style.display = "inline-block";
    }


  } catch (err) {
    console.error(err);
    respuestaDiv.innerHTML = "Error al conectar con el servidor.";
  }
}
