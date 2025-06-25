from flask import Flask, request, jsonify
import google.generativeai as genai
import os
import re
import json
from dotenv import load_dotenv
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

model = genai.GenerativeModel("models/gemini-1.5-flash-002")


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
        "- MUY IMPORTANTE: debe responderse esta semana\n"
        "- IMPORTANTE: puede responderse dentro de 2 semanas\n"
        "- OTROS: no requiere respuesta\n\n"
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
            "OTROS": []
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


if __name__ == '__main__':
    app.run(debug=True, port=5000)
