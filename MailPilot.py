
from flask import Flask, request, jsonify, render_template
import google.generativeai as genai
import os
import re
import json
from dotenv import load_dotenv
from flask_cors import CORS
from flask import redirect, session
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import os
import google.oauth2.credentials
import base64
import html
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"  # Solo para desarrollo HTTP

GOOGLE_CLIENT_SECRETS_FILE = "credentials.json"
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

app = Flask(__name__)
CORS(app, supports_credentials=True, origins=["http://localhost:3000", "http://localhost:5000"])


load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

model = genai.GenerativeModel("models/gemini-1.5-flash-002")
app.secret_key = 'super-secret-key'  # Replace with secure secret in prod

# CORS must allow credentials (cookies) for session to work


os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"  # For dev with HTTP (not HTTPS)

CLIENT_SECRETS_FILE = "credentials.json"
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

FRONTEND_URL = "http://localhost:5000"  # Change if your frontend is somewhere else




@app.route("/")
def home():
    return render_template("index.html")  # This will serve templates/index.html

@app.route('/responderMailSimple', methods=['POST'])
def responderMailSimple():
    data = request.get_json()
    mensaje = data.get("contenidoCorreo", "")
    print("Mensaje recibido:", mensaje)

    if not mensaje:
        return jsonify({"error": "Mensaje vacío"}), 400

    prompt = (
        "Sos un asistente profesional. Respondé este correo de forma cordial, clara y útil. "
        "No suenes como un robot. Sé breve, conciso y evitá preguntas innecesarias:\n\n"
        f"{mensaje}"
    )

    try:
        response = model.generate_content(prompt)
        print("Respuesta generada:", response.text)
        return jsonify({"respuesta": response.text})
    except Exception as e:
        print("Error al generar respuesta:", e)
        return jsonify({"error": str(e)}), 500


@app.route('/resumirCorreos', methods=['POST'])
def resumirCorreos():
    data = request.get_json()
    correos = data.get("correos", [])

    if not correos or not isinstance(correos, list):
        return jsonify({"error": "Se requiere una lista de correos"}), 400

    agrupados = {}
    for correo in correos:
        emisor = correo.get("emisor", "Desconocido")
        cuerpo = correo.get("cuerpo", "").strip()
        if cuerpo:
            agrupados.setdefault(emisor, []).append(cuerpo)

    respuestas = {}
    for emisor, textos in agrupados.items():
        concatenado = "\n\n---\n\n".join(textos)
        prompt = (
            f"Leé estos correos de {emisor} y generá un resumen claro y útil. "
            "Usá un tono profesional y directo. Evitá repeticiones. Mantené lo importante:\n\n"
            f"{concatenado}"
        )

        try:
            respuesta = model.generate_content(prompt)
            respuestas[emisor] = respuesta.text.strip()
        except Exception as e:
            respuestas[emisor] = f"❌ Error al generar resumen: {str(e)}"

    return jsonify({"resumenes": respuestas})


@app.route('/clasificarMails', methods=['POST'])
def clasificarMails():
    data = request.get_json()
    correos = data.get("correos", [])

    if not correos:
        return jsonify({"error": "No se recibieron correos"}), 400

    prompt = (
        "Tu tarea es clasificar cada correo según la prioridad con base en su contenido.\n\n"
        "Usá las siguientes categorías:\n"
        "- URGENTE: debe responderse hoy\n"
        "- MUY IMPORTANTE: debe responderse entre hooy y manana\n"
        "- IMPORTANTE: puede responderse en esta semana\n"
        "- NO PRIORITARIO: requiere si o si una respuest que puede responderse en esta mes, osea no es algo prioritario\n"
        "- OTROS: no requiere respuesta inmediata\n\n"
        "- INECESARIO RESPONDER: no requiere respuesta, o respodnerlo es totalmente opcional\n\n"
        "Para cada correo, devolvé un JSON con:\n"
        "- 'prioridad'\n"
        "- 'remitente'\n"
        "- 'resumen'\n"
        "- 'fecha_mencionada' (YYYY-MM-DD o null)\n\n"
        "Ejemplo de salida:\n"
        "[\n"
        "  {\"prioridad\": \"URGENTE\", \"remitente\": \"Juan Perez\", \"resumen\": \"Firma urgente del contrato.\", \"fecha_mencionada\": \"2025-06-20\"},\n"
        "  ...\n"
        "]\n\n"
        "Correos:\n"
    )

    for idx, correo in enumerate(correos):
        prompt += f"Correo {idx+1} de {correo['remitente']}:\n{correo['contenido']}\n\n"

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()

        print("\n🔍 Respuesta cruda de Gemini:\n", text[:1000], "\n...")  # Ver los primeros 1000 caracteres

        json_match = re.search(r"\[\s*\{.*?\}\s*\]", text, re.DOTALL)
        if not json_match:
            raise ValueError("No se encontró un JSON válido en la respuesta de la IA.")

        clasificados_raw = json.loads(json_match.group(0))

        agrupados = {
            "URGENTE": [],
            "MUY IMPORTANTE": [],
            "IMPORTANTE": [],
            "NO PRIORITARIO": [],
            "OTROS": [],
            "INNECESARIO RESPONDER": []
        }

        for item in clasificados_raw:
            prioridad = item.get("prioridad", "OTROS").upper()
            if prioridad not in agrupados:
                prioridad = "OTROS"
            agrupados[prioridad].append(item)

        for grupo in agrupados:
            agrupados[grupo].sort(
                key=lambda x: x.get("fecha_mencionada") or "9999-12-31"
            )

        return jsonify({"clasificados": agrupados})

    except Exception as e:
        print("❌ Error procesando clasificación:", e)
        return jsonify({"error": f"Error procesando respuesta de Gemini: {str(e)}"}), 500










@app.route("/login")
def login():
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,
        scopes=SCOPES,
        redirect_uri="http://localhost:5000/callback"
    )
    auth_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true'
    )
    session['state'] = state
    return redirect(auth_url)


@app.route("/callback")
def callback():
    state = session.get('state')
    if not state:
        return "Session expired, try login again.", 400

    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,
        scopes=SCOPES,
        state=state,
        redirect_uri="http://localhost:5000/callback"
    )
    flow.fetch_token(authorization_response=request.url)
    credentials = flow.credentials

    # Save credentials to session (serialized as dict)
    session['credentials'] = {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }

    # After login, redirect back to your frontend page
    return redirect(FRONTEND_URL)


@app.route("/listar-correos")
def listar_correos():
    if 'credentials' not in session:
        return jsonify({"error": "User not authenticated"}), 401

    creds_data = session['credentials']
    creds = google.oauth2.credentials.Credentials(**creds_data)
    service = build('gmail', 'v1', credentials=creds)

    results = service.users().messages().list(userId='me', maxResults=10).execute()
    messages = results.get('messages', [])

    correos = []
    for msg in messages:
        msg_data = service.users().messages().get(userId='me', id=msg['id'], format='full').execute()
        headers = msg_data['payload'].get('headers', [])
        remitente = next((h['value'] for h in headers if h['name'] == 'From'), 'Desconocido')
        asunto = next((h['value'] for h in headers if h['name'] == 'Subject'), 'Sin asunto')
        cuerpo = extract_plain_text(msg_data['payload'])
        correos.append({
            "id": msg['id'],
            "remitente": remitente, 
            "asunto": asunto,
            "contenido": cuerpo
        })


    return jsonify(correos)


def extract_plain_text(payload):
    if "parts" in payload:
        for part in payload["parts"]:
            if part["mimeType"] == "text/plain":
                data = part["body"].get("data")
                if data:
                    return html.unescape(base64.urlsafe_b64decode(data).decode("utf-8"))
    elif payload.get("mimeType") == "text/plain":
        data = payload["body"].get("data")
        if data:
            return html.unescape(base64.urlsafe_b64decode(data).decode("utf-8"))
    return "(Sin contenido de texto)"


if __name__ == "__main__":
    app.run(port=5000, debug=True)
