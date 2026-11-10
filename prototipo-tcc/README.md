# Prototipo navegable — MVP "Alertas de entregas y novedades" (TCC)

Prototipo móvil de la **Torre de Control** de TCC. **Estado: aprobado por el cliente** (2026-11-10).

Colores de marca TCC: amarillo `#FFD100`, rojo `#D81E05`, negro `#141414`.
Estados: pendiente/alerta = rojo · novedad = naranja `#D9480F` · entregada = verde `#15803D`.

## Pantallas (móvil, 390×844)

| Archivo | Pantalla | Contenido |
|---|---|---|
| `Main.dc.html` | 1 · Iniciar sesión | Login (correo + contraseña) |
| `Dashboard.dc.html` | 2 · Dashboard (controlador) | KPIs, mapa de paradas, lista de alertas con Confirmar/Resolver |
| `Parada.dc.html` | 3 · Detalle de parada | Datos de la parada, registro del conductor y resolución |
| `Admin.dc.html` | 4 · Administración | Usuarios/roles, vehículos y asignación conductor↔vehículo |

> No se incluye pantalla de conductor: su registro ya existe y se consume por ingesta (según el brief).

`canvas.json` es el índice del lienzo (posición y orden de cada pantalla).

## Cómo visualizarlo

Los `.dc.html` son el formato del lienzo de diseño (Artifact de tipo Design) y se ven mejor
en el artefacto publicado:
https://claude.ai/artifact/JrKnuz28BZZTeMZfR7e4n6
