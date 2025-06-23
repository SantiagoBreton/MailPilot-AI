from flask import Flask, request, jsonify
import google.generativeai as genai
import os
from dotenv import load_dotenv
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

# ✅ Modelo actualizado basado en tu cuenta
model = genai.GenerativeModel("models/gemini-1.5-flash-002")


@app.route('/responderMailSimple', methods=['POST'])
def responderMailSimple():
    data = request.get_json()
    mensaje = data.get("contenidoCorreo", "")
    print("Mensaje recibido:", mensaje)

    if not mensaje:
        return jsonify({"error": "Mensaje vacío"}), 400

    prompt = (
        "Sos un asistente profesional. Respondé este correo de forma cordial, clara y útil. No suene muy como un robot o inteligencia artificial. Se breve, conciso y no hagas un pregunta del estilo si quiero saber mas o esas cosas:\n\n"
        f"{mensaje}"
    )

    try:
        response = model.generate_content(prompt)
        print("Respuesta generada:", response.text)
        return jsonify({"respuesta": response.text})
    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500

@app.route('/resumirCorreos', methods=['POST'])
def resumirCorreos():
    data = request.get_json()
    correos = data.get("correos", [])

    if not correos or not isinstance(correos, list):
        return jsonify({"error": "Se requiere una lista de correos"}), 400

    # Agrupar por emisor
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
            f"Leé estos correos recibidos de una misma persona ({emisor}) y generá un resumen claro y útil. "
            "Usá un tono profesional, ordenado y directo. Evitá redundancias. Mantené los detalles clave:\n\n"
            f"{concatenado}"
        )

        try:
            respuesta = model.generate_content(prompt)
            respuestas[emisor] = respuesta.text.strip()
        except Exception as e:
            respuestas[emisor] = f"❌ Error al generar resumen: {str(e)}"

    return jsonify({"resumenes": respuestas})



if __name__ == '__main__':
    app.run(debug=True, port=5000)
