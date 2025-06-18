# Instant3D - Plataforma Web para Generación de Modelos 3D con IA

## Proyecto de Tesis: "Objetos tridimensionales creados por IA: Innovación en entornos virtuales"

**Instant3D** es un proyecto de tesis desarrollado para la Universidad Técnica Particular de Loja (UTPL), enmarcado bajo el título: **"Objetos tridimensionales creados por IA: Innovación en entornos virtuales"**. Consiste en una plataforma web que permite a los usuarios transformar diversas entradas (texto, imágenes, bocetos) en modelos 3D mediante el uso de Inteligencia Artificial. El frontend está construido con React, Vite y Tailwind CSS, ofreciendo una experiencia de usuario moderna y accesible.

**Proyecto desplegado en:** [https://instant3d.vercel.app/](https://instant3d.vercel.app/)

## 🎓 Propósito del Proyecto

Este proyecto tiene como objetivo principal investigar y desarrollar una solución accesible para la creación de contenido 3D, demostrando la innovación que la Inteligencia Artificial puede aportar a los entornos virtuales. Busca facilitar a usuarios, tanto técnicos como no técnicos, la generación de activos 3D a partir de conceptos simples, contribuyendo así al avance y aplicación de la IA en el modelado tridimensional.

## ✨ Funcionalidades Principales

*   **Múltiples Métodos de Generación 3D con IA:**
    *   **Texto a 3D:** Genera modelos a partir de descripciones textuales.
    *   **Imagen a 3D:** Convierte una imagen 2D en un modelo 3D.
    *   **Texto a Imagen a 3D:** Proceso en dos etapas que primero genera una imagen desde texto y luego la convierte a 3D.
    *   **Múltiples Imágenes a 3D:** Utiliza vistas frontal, lateral y trasera para reconstruir un objeto 3D.
    *   **Boceto a 3D:** Permite dibujar en un lienzo interactivo y convertir el boceto en un modelo 3D.
    *   **Único a 3D:** Método especializado para la generación de objetos 3D a partir de una sola imagen con características particulares.
*   **Sistema de Autenticación de Usuarios:**
    *   Registro y inicio de sesión con correo electrónico y contraseña.
    *   Autenticación mediante Google (OAuth).
    *   Procesos seguros de verificación de correo y restablecimiento de contraseña.
*   **Dashboard Personalizado para Usuarios:**
    *   **Visualizador de Objetos:** Galería personal para explorar, gestionar y descargar los modelos 3D generados, con filtros por tipo de generación.
    *   **Tutoriales:** Sección con videos instructivos (contenido dinámico desde Hygraph) para guiar al usuario en el uso de la plataforma.
    *   **Configuración de Perfil:** Permite al usuario actualizar su nombre, foto de perfil y gestionar su cuenta, incluyendo la eliminación de la misma.
*   **Visualizador 3D Interactivo:**
    *   Renderizado de modelos en formato `.glb` y `.obj`.
    *   Controles para rotación, zoom y paneo.
    *   Opciones para visualizar la malla (wireframe) y aplicar/quitar texturas.
    *   Funcionalidad de descarga para modelos 3D y texturas asociadas.
    *   Iluminación realista mediante entorno HDR.
*   **Sección de Documentación Dinámica:**
    *   Guías y documentación técnica sobre el uso de la plataforma y los modelos de IA, con contenido gestionado desde Hygraph para fácil actualización.
*   **Internacionalización (i18n):**
    *   Soporte completo para múltiples idiomas (Español e Inglés).
    *   Detección automática del idioma del navegador del usuario para una experiencia localizada desde el primer momento.
    *   Tanto la interfaz como el contenido dinámico (tutoriales, documentación) se adaptan al idioma seleccionado.
*   **Interfaz de Usuario Moderna y Responsiva:**
    *   Desarrollada con Tailwind CSS y componentes de Flowbite, asegurando una experiencia de usuario óptima en diversos dispositivos.
*   **Gestión de Estado con React Context API:**
    *   Gestión centralizada para el estado de autenticación, resultados de las predicciones y contenido de la documentación.

## 🛠️ Tecnologías Utilizadas (Frontend)

*   **Framework Principal:** React 18+
*   **Herramienta de Construcción:** Vite
*   **Lenguaje:** JavaScript (JSX)
*   **Estilos:** Tailwind CSS, Flowbite, PostCSS
*   **Enrutamiento:** React Router DOM v6
*   **Gestión de Estado:** React Context API & `useReducer`
*   **Renderizado 3D:** Three.js, @react-three/fiber, @react-three/drei
*   **Internacionalización:** i18next con `react-i18next`
*   **Autenticación (Frontend):** Firebase Authentication
*   **CMS (Contenido Dinámico):** Hygraph (para tutoriales y documentación)
*   **Cliente HTTP:** Axios (para comunicación con el backend de IA)
*   **Animaciones:** Framer Motion
*   **Iconografía:** Phosphor Icons
*   **Analíticas:** Vercel Speed Insights

## 📁 Estructura del Proyecto (Frontend)

La estructura del proyecto está organizada para facilitar la modularidad y escalabilidad, siguiendo una arquitectura por funcionalidades (*features*):
```
Frontend-CubeAI/
├── public/ # Archivos estáticos (imágenes, locales para i18n)
├── src/
│ ├── assets/ # Imágenes, modelos HDR, etc.
│ ├── components/ # Componentes UI genéricos (modales, botones)
│ ├── config/ # Configuración (Firebase, cliente Hygraph, i18n)
│ ├── features/ # Módulos funcionales principales:
│ │ ├── auth/ # Autenticación (páginas, hooks, servicios)
│ │ ├── dashboard/ # Dashboard del usuario
│ │ ├── documentacion/ # Sección de documentación
│ │ └── prediction/ # Lógica de generación 3D (componentes, hooks, servicios)
│ ├── layouts/ # Estructuras de página (Público, Dashboard, Docs)
│ ├── lib/ # Librerías auxiliares (queries Hygraph)
│ ├── pages/ # Páginas principales (HomePage, TutorialsPage)
│ ├── App.jsx # Componente raíz y enrutador principal
│ ├── main.jsx # Punto de entrada de React
│ └── index.css # Estilos globales y de Tailwind
├── .env.example # Ejemplo de variables de entorno
├── vercel.json # Configuración de despliegue en Vercel
├── vite.config.js # Configuración de Vite
├── tailwind.config.js # Configuración de Tailwind CSS
└── README.md # Este archivo
```
*(Las variables de entorno sensibles como las claves de API de Firebase, Hygraph y la URL del backend son necesarias para la funcionalidad completa y se gestionan de forma segura en el entorno de despliegue).*

## 🚀 Despliegue

El proyecto está actualmente desplegado en Vercel y accesible en:
[https://instant3d.vercel.app/](https://instant3d.vercel.app/)

La configuración de Vercel (`vercel.json`) maneja las reescrituras necesarias para el enrutamiento de la SPA.

## 👨‍💻 Autor

**Carlos Andrés Vargas Ramírez**
*   Estudiante de Ingeniería en Sistemas Informáticos y Computación - Universidad Técnica Particular de Loja (UTPL)

## 📄 Licencia

Este proyecto se presenta como parte del trabajo de tesis **"Objetos tridimensionales creados por IA: Innovación en entornos virtuales"** y su uso está principalmente destinado a fines académicos y de demostración en dicho contexto.