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

class Img3DService(BaseGenerationService):
    def __init__(self):
        super().__init__(collection_name="Imagen3D", readable_name="Imagen a 3D")
        self.client = create_hf_client(os.getenv("CLIENT_IMAGEN3D_URL"))

    def create_generation(self, user_uid, image_file, generation_name):
        if self._generation_exists(user_uid, generation_name):
            raise ValueError("El nombre de la generación ya existe. Por favor, elige otro nombre.")

        unique_filename = f"temp_image_{uuid.uuid4().hex}.png"
        image_file.save(unique_filename)
        
        temp_files_to_clean = [unique_filename]

        try:
            self.client.predict(api_name="/start_session")
            
            result_preprocess = self.client.predict(
                image=handle_file(unique_filename),
                api_name="/preprocess_image"
            )
            preprocess_image_path = result_preprocess
            if not os.path.exists(preprocess_image_path):
                raise FileNotFoundError(f"El archivo preprocesado {preprocess_image_path} no existe.")
            temp_files_to_clean.append(preprocess_image_path)
            
            result_get_seed = self.client.predict(randomize_seed=True, seed=0, api_name="/get_seed")
            seed_value = result_get_seed
            
            result_image_to_3d = self.client.predict(
                image=handle_file(preprocess_image_path),
                seed=seed_value,
                ss_guidance_strength=7.5,
                ss_sampling_steps=12,
                slat_guidance_strength=3,
                slat_sampling_steps=12,
                api_name="/image_to_3d"
            )
            generated_3d_asset = result_image_to_3d["video"]
            if not os.path.exists(generated_3d_asset):
                raise FileNotFoundError(f"El archivo generado {generated_3d_asset} no existe.")
            temp_files_to_clean.append(generated_3d_asset)

            result_extract_glb = self.client.predict(
                mesh_simplify=0.95,
                texture_size=1024,
                api_name="/extract_glb"
            )
            extracted_glb_path = result_extract_glb[1]
            if not os.path.exists(extracted_glb_path):
                raise FileNotFoundError(f"El archivo GLB {extracted_glb_path} no existe.")
            temp_files_to_clean.append(extracted_glb_path)
            
            self.client.predict(api_name="/end_session")

            generation_folder = f'{user_uid}/{self.collection_name}/{generation_name}'
            glb_url = upload_to_storage(extracted_glb_path, f'{generation_folder}/model.glb')        
            preview_video_url = upload_to_storage(generated_3d_asset, f'{generation_folder}/preview.mp4')       
            preprocess_url = upload_to_storage(preprocess_image_path, f'{generation_folder}/preprocess.png')
            
            normalized_result = {
                "generation_name": generation_name,
                "prediction_type": self.readable_name,
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "modelUrl": glb_url,
                "previewUrl": preview_video_url,
                "downloads": [{"format": "GLB", "url": glb_url}],
                "raw_data": {"preprocess_image_url": preprocess_url}
            }
            
            doc_ref = db.collection('predictions').document(user_uid).collection(self.collection_name).document(generation_name)
            doc_ref.set(normalized_result)
            
            return normalized_result
        
        except Exception as e:
            error_message = str(e)
            if "You have exceeded your GPU quota" in error_message:
                raise ValueError("Has excedido tu cuota de uso de GPU. Por favor, intenta más tarde.")
            elif "None" in error_message: 
                raise ValueError("No hay GPUs disponibles en este momento, por favor inténtalo más tarde.")
            else:
                raise
        
        finally:
            for file_path in temp_files_to_clean:
                if file_path and os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except OSError as e:
                        print(f"Error al eliminar el archivo temporal {file_path}: {e}")

img3d_service = Img3DService()