# Breakwater — North Quay

A single-page procedural harbor study built directly on WebGL 2. Geometry, weathered container textures, cloud cover, ocean waves, rain and ambient sound are generated in the browser. There are no downloaded assets, dependencies or build steps.

## Local demo

From this folder, run:

    python -m http.server 8000 --bind 127.0.0.1

Open http://127.0.0.1:8000/ in a WebGL 2 browser.

## GitHub Pages

Commit these files to your repository. In Settings → Pages, choose **Deploy from a branch**, select the branch and **/ (root)**, then save. Relative module and stylesheet paths support repository subpaths.

## Controls

Drag the scene or focus it and use the arrow keys to look around. Scroll or press + / − to zoom. Use the viewpoint arrows for quay, offshore and elevated views. Rainfall controls droplet density and surface ripples. Wind drives waves, rain drift and suspended lamps. Pause freezes the simulation while preserving camera navigation. Audio is opt-in.
