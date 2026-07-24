import { convertFileSrc } from '@tauri-apps/api/core'
import type { MotionInfo } from 'easy-live2d'
import { Config, CubismSetting, Live2DSprite, Priority } from 'easy-live2d'
import { Application, Ticker } from 'pixi.js'

Config.MouseFollow = true

export interface ModelSize {
  width: number
  height: number
}

function joinPath(base: string, ...parts: string[]): string {
  const b = base.replace(/\\/g, '/').replace(/\/+$/, '')
  const rest = parts
    .map((p) => p.replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
  return [b, ...rest].join('/')
}

class Live2d {
  private app: Application | null = null
  public model: Live2DSprite | null = null
  private modelSize: ModelSize | null = null

  private async initApp(canvas: HTMLCanvasElement) {
    if (this.app) return
    this.app = new Application()
    await this.app.init({
      view: canvas,
      resizeTo: window,
      backgroundAlpha: 0,
      autoDensity: true,
      resolution: Math.min(devicePixelRatio, 2),
    })
  }

  async load(canvas: HTMLCanvasElement, modelDir: string, modelFile: string) {
    await this.initApp(canvas)
    this.destroyModel()

    const modelPath = joinPath(modelDir, modelFile)
    const res = await fetch(convertFileSrc(modelPath))
    if (!res.ok) {
      throw new Error(`模型文件读取失败: ${modelPath}`)
    }
    const modelJSON = await res.json()

    const modelSetting = new CubismSetting({ modelJSON })
    modelSetting.redirectPath(({ file }) => convertFileSrc(joinPath(modelDir, file)))

    this.model = new Live2DSprite({
      modelSetting,
      ticker: Ticker.shared,
    })
    this.app!.stage.addChild(this.model)

    await this.model.ready
    this.modelSize = { width: this.model.width, height: this.model.height }
    this.resizeModel()

    return {
      width: this.model.width,
      height: this.model.height,
      motions: this.model.getMotions(),
      expressions: this.model.getExpressions(),
    }
  }

  resizeModel(modelSize?: ModelSize) {
    if (!this.model) return
    if (modelSize) {
      this.modelSize = modelSize
    }
    const size = this.modelSize
    if (!size) return
    const scale = Math.min(innerWidth / size.width, innerHeight / size.height)
    this.model.scale.set(scale)
    this.model.x = innerWidth / 2
    this.model.y = innerHeight / 2
    this.model.anchor.set(0.5)
  }

  startMotion(motion: MotionInfo) {
    return this.model?.startMotion({ ...motion, priority: Priority.Normal })
  }

  startRandomMotion(group: string) {
    return this.model?.startRandomMotion({ group, priority: Priority.Normal })
  }

  setExpression(index: number) {
    return this.model?.setExpression({ index })
  }

  setRandomExpression() {
    this.model?.setRandomExpression()
  }

  destroyModel() {
    if (!this.model) return
    this.model.destroy()
    this.model = null
  }

  destroy() {
    this.destroyModel()
    this.app?.destroy()
    this.app = null
  }
}

const live2d = new Live2d()

export default live2d
