from .base_generation_service import BaseGenerationService
from config.firebase_config import db
from config.huggingface_config import create_hf_client
from gradio_client import handle_file
from dotenv import load_dotenv
from huggingface_hub import login
import datetime
import uuid
import os
from utils.storage_utils import upload_to_storage

load_dotenv()
HF_TOKEN = os.getenv("HF_TOKEN")
login(token=HF_TOKEN)

class MultiImg3DService(BaseGenerationService):
    def __init__(self):
        super().__init__(collection_name="MultiImagen3D", readable_name="Multi Imagen a 3D")
        self.client = create_hf_client(os.getenv("CLIENT_MULTI3D_URL"))

    def create_multiimg3d(self, user_uid, frontal_image, lateral_image, trasera_image, generation_name):
        if self._generation_exists(user_uid, generation_name):
            raise ValueError("El nombre de la generación ya existe. Por favor, elige otro nombre.")

        temp_input_files = {
            "frontal": f"temp_frontal_{uuid.uuid4().hex}.png",
            "lateral": f"temp_lateral_{uuid.uuid4().hex}.png",
            "trasera": f"temp_trasera_{uuid.uuid4().hex}.png"
        }
        frontal_image.save(temp_input_files["frontal"])
        lateral_image.save(temp_input_files["lateral"])
        trasera_image.save(temp_input_files["trasera"])

        temp_files_to_clean = list(temp_input_files.values())

        try:
            self.client.predict(api_name="/start_session")

            preprocess_results = self.client.predict(
                images=[
                    {"image": handle_file(temp_input_files["frontal"])},
                    {"image": handle_file(temp_input_files["lateral"])},
                    {"image": handle_file(temp_input_files["trasera"])}
                ],
                api_name="/preprocess_images"
            )
            if not isinstance(preprocess_results, list) or len(preprocess_results) != 3:
                raise ValueError("Error al preprocesar las imágenes: respuesta inválida.")

            preprocess_paths = [res["image"] for res in preprocess_results]
            for path in preprocess_paths:
                if not os.path.exists(path):
                    raise FileNotFoundError(f"El archivo preprocesado {path} no existe.")
            temp_files_to_clean.extend(preprocess_paths)

            result_get_seed = self.client.predict(randomize_seed=True, seed=0, api_name="/get_seed")
            if not isinstance(result_get_seed, int):
                raise ValueError(f"Seed inválido: {result_get_seed}")
            seed_value = result_get_seed

            result_image_to_3d = self.client.predict(
                multiimages=[
                    {"image": handle_file(preprocess_paths[0])},
                    {"image": handle_file(preprocess_paths[1])},
                    {"image": handle_file(preprocess_paths[2])}
                ],
                seed=seed_value,
                ss_guidance_strength=7.5,
                ss_sampling_steps=12,
                slat_guidance_strength=3,
                slat_sampling_steps=12,
                multiimage_algo="stochastic",
                api_name="/image_to_3d"
            )
            if not isinstance(result_image_to_3d, dict) or "video" not in result_image_to_3d:
                raise ValueError("Error al generar modelo 3D: respuesta inválida.")
            generated_3d_asset = result_image_to_3d["video"]
            if not os.path.exists(generated_3d_asset):
                raise FileNotFoundError(f"El archivo 3D generado {generated_3d_asset} no existe.")
            temp_files_to_clean.append(generated_3d_asset)

            result_extract_glb = self.client.predict(
                mesh_simplify=0.95,
                texture_size=1024,
                api_name="/extract_glb"
            )
            extracted_glb_path = result_extract_glb[1]
            if not os.path.exists(extracted_glb_path):
                raise FileNotFoundError(f"El archivo GLB extraído {extracted_glb_path} no existe.")
            temp_files_to_clean.append(extracted_glb_path)

            self.client.predict(api_name="/end_session")

            generation_folder = f'{user_uid}/{self.collection_name}/{generation_name}'
            glb_url = upload_to_storage(extracted_glb_path, f'{generation_folder}/model.glb')
            preview_video_url = upload_to_storage(generated_3d_asset, f'{generation_folder}/preview.mp4')
            preprocess_urls = {
                "frontal": upload_to_storage(preprocess_paths[0], f'{generation_folder}/preprocess_frontal.png'),
                "lateral": upload_to_storage(preprocess_paths[1], f'{generation_folder}/preprocess_lateral.png'),
                "trasera": upload_to_storage(preprocess_paths[2], f'{generation_folder}/preprocess_trasera.png')
            }

            normalized_result = {
                "generation_name": generation_name,
                "prediction_type": self.readable_name,
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "modelUrl": glb_url,
                "previewUrl": preview_video_url,
                "downloads": [{"format": "GLB", "url": glb_url}],
                "raw_data": {"preprocess_image_urls": preprocess_urls}
            }

            doc_ref = db.collection('predictions').document(user_uid).collection(self.collection_name).document(generation_name)
            doc_ref.set(normalized_result)

            return normalized_result

        except Exception as e:
            raise

        finally:
            for file_path in temp_files_to_clean:
                if file_path and os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except OSError as e:
                        print(f"Error al eliminar el archivo temporal {file_path}: {e}")

multiimg3d_service = MultiImg3DService()