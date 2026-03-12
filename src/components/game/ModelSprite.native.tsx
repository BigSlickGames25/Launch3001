import { GLView } from "expo-gl";
import { loadAsync, Renderer } from "expo-three";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as THREE from "three";

import { theme } from "../../theme";
import { ModelKind, ModelSpriteProps } from "./model-types";

const modelSources: Record<ModelKind, number> = {
  launchpad: require("../../../assets/3Dmodels/launchpad.glb"),
  rocket: require("../../../assets/3Dmodels/rocket.glb")
};

const modelCache = new Map<number, Promise<THREE.Object3D>>();

type RuntimeState = {
  anchor: THREE.Group;
  baseScale: number;
  camera: THREE.PerspectiveCamera;
  directionalLight: THREE.DirectionalLight;
  gl: WebGLRenderingContext & { endFrameEXP?: () => void };
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
};

function disposeObject(object: THREE.Object3D) {
  object.traverse((child: THREE.Object3D) => {
    const mesh = child as THREE.Mesh;

    mesh.geometry?.dispose?.();

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((material: THREE.Material) => material.dispose?.());
    } else {
      mesh.material?.dispose?.();
    }
  });
}

function cloneModel(object: THREE.Object3D) {
  return object.clone(true);
}

async function loadModel(source: number) {
  const cached = modelCache.get(source);

  if (cached) {
    return cached;
  }

  const promise = (async () => {
    const gltf = await loadAsync(source);

    return "scene" in gltf ? gltf.scene : gltf;
  })();

  modelCache.set(source, promise);

  return promise;
}

function createAnchoredModel(kind: ModelKind, baseModel: THREE.Object3D) {
  const cloned = cloneModel(baseModel);
  const bounds = new THREE.Box3().setFromObject(cloned);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();

  bounds.getSize(size);
  bounds.getCenter(center);

  cloned.position.x -= center.x;
  cloned.position.y -= center.y;
  cloned.position.z -= center.z;

  const anchor = new THREE.Group();
  const maxDimension = Math.max(size.x, size.y, size.z) || 1;
  const targetSize = kind === "rocket" ? 2.7 : 3.4;
  const scale = targetSize / maxDimension;

  anchor.scale.setScalar(scale);
  anchor.add(cloned);

  if (kind === "rocket") {
    anchor.rotation.x = Math.PI / 2;
    anchor.rotation.z = Math.PI;
  } else {
    anchor.rotation.y = -Math.PI * 0.18;
  }

  return {
    anchor,
    baseScale: scale
  };
}

export function ModelSprite(props: ModelSpriteProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const runtimeRef = useRef<RuntimeState | null>(null);
  const mountedRef = useRef(true);
  const frameRef = useRef<number | null>(null);
  const propsRef = useRef(props);

  propsRef.current = props;

  function renderFrame() {
    const runtime = runtimeRef.current;

    if (!runtime || !mountedRef.current) {
      return;
    }

    const { anchor, baseScale, camera, directionalLight, gl, renderer, scene } =
      runtime;
    const current = propsRef.current;
    const isRocket = current.kind === "rocket";

    if (isRocket) {
      anchor.rotation.x = Math.PI / 2;
      anchor.rotation.z = Math.PI - (current.rotation ?? 0);
      const thrustBoost = current.thrusting ? 1.12 : 1;

      anchor.scale.setScalar(baseScale * thrustBoost);
      directionalLight.intensity = current.thrusting ? 1.75 : 1.2;
      camera.position.set(0, 0.15, 6.5);
    } else {
      anchor.rotation.x = 0;
      anchor.rotation.y = -Math.PI * 0.18;
      anchor.rotation.z = 0;
      anchor.scale.setScalar(baseScale);
      directionalLight.intensity = 1.05;
      camera.position.set(0, 0.55, 8.8);
    }

    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    gl.endFrameEXP?.();
    frameRef.current = requestAnimationFrame(renderFrame);
  }

  async function handleContextCreate(
    gl: WebGLRenderingContext & { endFrameEXP?: () => void }
  ) {
    try {
      const renderer = new Renderer({
        alpha: true,
        gl
      }) as unknown as THREE.WebGLRenderer;

      renderer.setClearColor(0x000000, 0);
      renderer.setSize(propsRef.current.width, propsRef.current.height);
      if ("outputColorSpace" in renderer) {
        renderer.outputColorSpace = THREE.SRGBColorSpace;
      }

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        26,
        Math.max(propsRef.current.width, 1) / Math.max(propsRef.current.height, 1),
        0.1,
        100
      );
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);

      directionalLight.position.set(3.4, 3.6, 4.8);
      scene.add(ambientLight, directionalLight);

      const baseModel = await loadModel(modelSources[propsRef.current.kind]);
      const { anchor, baseScale } = createAnchoredModel(
        propsRef.current.kind,
        baseModel
      );

      scene.add(anchor);

      runtimeRef.current = {
        anchor,
        baseScale,
        camera,
        directionalLight,
        gl,
        renderer,
        scene
      };

      if (mountedRef.current) {
        setStatus("ready");
        renderFrame();
      }
    } catch (error) {
      console.warn("ModelSprite failed to load GLB asset.", error);

      if (mountedRef.current) {
        setStatus("error");
      }
    }
  }

  useEffect(() => {
    const runtime = runtimeRef.current;

    if (!runtime) {
      return;
    }

    runtime.camera.aspect = Math.max(props.width, 1) / Math.max(props.height, 1);
    runtime.camera.updateProjectionMatrix();
    runtime.renderer.setSize(props.width, props.height);
  }, [props.height, props.width]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }

      const runtime = runtimeRef.current;

      if (!runtime) {
        return;
      }

      disposeObject(runtime.anchor);
      runtime.renderer.dispose();
      runtimeRef.current = null;
    };
  }, []);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrapper,
        {
          height: props.height,
          left: props.left,
          top: props.top,
          width: props.width
        }
      ]}
    >
      {status !== "ready" ? <FallbackModelSprite {...props} left={0} top={0} /> : null}
      <GLView
        onContextCreate={handleContextCreate}
        style={[StyleSheet.absoluteFill, status !== "ready" && styles.hidden]}
      />
      {props.kind === "launchpad" && props.label ? (
        <Text style={styles.padBadge}>{props.label}</Text>
      ) : null}
    </View>
  );
}

function FallbackModelSprite({
  height,
  kind,
  label,
  left,
  rotation = 0,
  thrusting = false,
  top,
  width
}: ModelSpriteProps) {
  if (kind === "launchpad") {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.padShell,
          {
            height,
            left,
            top,
            width
          }
        ]}
      >
        <View
          style={[
            styles.padBody,
            label === "LAND" ? styles.padBodyFinish : styles.padBodyStart
          ]}
        />
      </View>
    );
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.rocketShell,
        {
          height,
          left,
          top,
          transform: [{ rotate: `${rotation}rad` }],
          width
        }
      ]}
    >
      {thrusting ? (
        <View
          style={[
            styles.rocketFlame,
            {
              height: Math.max(18, height * 0.22),
              top: height * 0.82,
              width: Math.max(16, width * 0.22)
            }
          ]}
        />
      ) : null}
      <View style={[styles.rocketBody, { borderRadius: Math.max(8, width * 0.18) }]} />
      <View
        style={[
          styles.rocketWindow,
          {
            height: Math.max(7, width * 0.11),
            marginLeft: -Math.max(3.5, width * 0.055),
            width: Math.max(7, width * 0.11)
          }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: "visible",
    position: "absolute"
  },
  hidden: {
    opacity: 0
  },
  padShell: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute"
  },
  padBody: {
    borderRadius: 999,
    borderWidth: 1,
    height: "100%",
    width: "100%"
  },
  padBodyStart: {
    backgroundColor: "rgba(56, 189, 248, 0.16)",
    borderColor: "rgba(125, 199, 255, 0.58)"
  },
  padBodyFinish: {
    backgroundColor: "rgba(249, 115, 22, 0.2)",
    borderColor: "rgba(255, 190, 120, 0.62)"
  },
  padBadge: {
    backgroundColor: "rgba(6, 16, 29, 0.72)",
    borderRadius: 999,
    color: theme.colors.text,
    fontFamily: theme.fonts.label,
    fontSize: 10,
    left: "50%",
    letterSpacing: 1.1,
    marginLeft: -26,
    marginTop: -8,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: "absolute",
    textAlign: "center",
    textTransform: "uppercase",
    top: "50%",
    width: 52
  },
  rocketShell: {
    alignItems: "center",
    position: "absolute"
  },
  rocketBody: {
    backgroundColor: "#d8e5f7",
    borderColor: "rgba(255,255,255,0.66)",
    borderWidth: 1,
    bottom: 0,
    left: "50%",
    marginLeft: -9,
    position: "absolute",
    top: 0,
    width: 18
  },
  rocketWindow: {
    backgroundColor: theme.colors.accent,
    borderRadius: 999,
    left: "50%",
    position: "absolute",
    top: "30%"
  },
  rocketFlame: {
    backgroundColor: "rgba(251, 191, 36, 0.92)",
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    left: "50%",
    marginLeft: -9,
    position: "absolute"
  }
});
