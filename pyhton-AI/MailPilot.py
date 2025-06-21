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


@app.route('/responder', methods=['POST'])
def responder():
    data = request.get_json()
    mensaje = data.get("contenidoCorreo", "")
    print("Mensaje recibido:", mensaje)

    if not mensaje:
        return jsonify({"error": "Mensaje vacío"}), 400

    prompt = (
        "Sos un asistente profesional. Respondé este correo de forma cordial, clara y útil. No suene muy como un robot o inteligencia artificial. Se breve consicos y no hagas un pregunta del estilo si quiero saber mas o esas cosas:\n\n"
        f"{mensaje}"
    )

    try:
        response = model.generate_content(prompt)
        print("Respuesta generada:", response.text)
        return jsonify({"respuesta": response.text})
    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
