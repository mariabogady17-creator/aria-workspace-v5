# 🧪 GUÍA DE PRUEBAS QA - A.R.I.A. V5 (EDICIÓN J.A.R.V.I.S)

¡Hola! Si estás leyendo esto, tienes la importante misión de probar el sistema A.R.I.A. V5. 
Por favor, sigue esta lista de comprobación y reporta si encuentras alguna pantalla blanca, botón que no funcione o problema de diseño.

---

## 1. 🔒 Pantalla de Inicio y Autenticación
- [ ] Entrar a `http://localhost:3000`.
- [ ] Visualizar el nuevo fondo animado (Shader Background) detrás del Login.
- [ ] Intentar hacer clic en el candado azul gigante (Protocolo de Acceso).
- [ ] Verificar que la transición al entrar a la app es suave y sin parpadeos extraños.

## 2. 💬 Interfaz Principal (ChatView)
- [ ] Verificar que la barra de texto (donde escribes el mensaje) tenga un margen cómodo (el texto no debe estar pegado a los bordes).
- [ ] Dar clic en el botón `+` (Acciones Rápidas) y comprobar que se despliega el menú correctamente.
- [ ] Verificar que el menú de Selección de Modelo (ej: "3.6 Flash") se abre hacia arriba y permite cambiar el modelo.
- [ ] Usar el atajo `Espacio` en el teclado: Debe abrirse inmediatamente el **Modo Manos Libres** (círculos concéntricos de J.A.R.V.I.S).
- [ ] En el Modo Manos Libres, presionar `Esc` para salir y regresar al chat sin problemas.

## 3. 📄 Exportación Multi-Formato (Documentos)
- [ ] En el chat, pedirle a la IA: *"Genera una tabla simple de 2x2 y devuélvela como archivo Excel usando el comando [ARIA_DOCUMENT type='xlsx' title='Prueba']"* (O usar la acción rápida de Generación Multi-Formato).
- [ ] Verificar que en el chat aparezca una tarjeta bonita con un botón de **"Exportar a Excel"**.
- [ ] Hacer clic en el botón y asegurarse de que el archivo se descarga correctamente (.xlsx).
- [ ] (Opcional) Probar lo mismo para Word (`docx`) y PowerPoint (`pptx`). 
- [ ] **Importante:** La app *no* debe quedarse en pantalla blanca al hacer esto.

## 4. 🗃️ Bóveda de Documentos y Pantalla Dividida
- [ ] Ir a la pestaña **"Bóveda"** (DocumentVaultView) en el menú izquierdo.
- [ ] Hacer clic en el botón de "Previsualizar" (el ojito) en cualquier documento de la lista (ej: "Q3 Financial Projections").
- [ ] Asegurarse de que el documento se abre en un panel lateral en modo **Pantalla Dividida** (Split Screen), compartiendo pantalla con el Chat.
- [ ] Redimensionar la ventana del navegador para verificar que la pantalla dividida no se rompe y que el chat sigue siendo utilizable.
- [ ] Cerrar el editor de documentos con la 'X' y comprobar que vuelve a la normalidad.

## 5. 🛡️ Panel de Administración (Centro de Comando)
- [ ] Ir a la pestaña **"Admin"** en la barra lateral.
- [ ] Verificar que el diseño de esta pantalla es oscuro/hacker, con título "Centro de Comando Neural" y un indicador verde de "Online".
- [ ] Revisar la lista de "Usuarios Registrados del Sistema".
- [ ] Hacer clic en el botón **"Editar Roles"** y verificar que los botones grises se vuelven botones activos (Admin/Pro/Free).
- [ ] Probar el botón **"Compartir Sistema (Remoto)"** y ver que aparece una notificación tipo "Generando túnel seguro...".

## 6. 🤖 Menú de Agentes Autónomos
- [ ] Ir a la pestaña **"Agentes"**.
- [ ] Verificar que la pantalla se visualiza correctamente y que la barra lateral (Sidebar) **no se superpone** ni oculta el contenido.

## 7. 📱 Responsividad (Prueba en Celular / Reducción de Ventana)
- [ ] Reducir la ventana del navegador a un tamaño muy pequeño (como si fuera un celular).
- [ ] Verificar que el menú izquierdo se oculta correctamente o se convierte en un menú inferior/colapsable (según el comportamiento por defecto).
- [ ] Verificar que el chat y el campo de texto se ajusten bien sin salirse de la pantalla.

---
**📝 Notas para el Tester:**
Anota cualquier error de consola (F12 > Console) si encuentras algún fallo. ¡Gracias por tu ayuda!
