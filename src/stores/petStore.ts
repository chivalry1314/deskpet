import { invoke } from '@tauri-apps/api/core'
import type { PetInfo, Manifest, Settings } from '../types'
export type { PetInfo, Manifest, Settings }

export type SavePetPayload = {
  config: Manifest
  images: number[][]
  image_names: string[]
} & Record<string, unknown>

export async function listLocalPets(): Promise<PetInfo[]> {
  return invoke('list_local_pets')
}

export async function deletePet(petName: string): Promise<void> {
  return invoke('delete_pet', { petName })
}

export async function loadPet(petName: string): Promise<Manifest> {
  return invoke('load_pet', { petName })
}

export async function savePet(payload: SavePetPayload): Promise<void> {
  return invoke('save_pet', { payload })
}

export async function spawnPetWindow(petName: string): Promise<void> {
  return invoke('spawn_pet_window', { petName })
}

export async function closePetWindow(): Promise<void> {
  return invoke('close_pet_window')
}

export async function exportPet(petName: string): Promise<number[]> {
  return invoke('export_pet', { petName })
}

/** 导出 .pet 到磁盘（数据目录/DeskPet/exports/），返回文件路径 */
export async function exportPetToDisk(petName: string): Promise<string> {
  return invoke('export_pet_to_disk', { petName })
}

/** 迁移已有宠物到新数据目录 */
export async function migratePets(newBase: string): Promise<void> {
  return invoke('migrate_pets', { newBase })
}

export async function importPet(bytes: number[], newName?: string): Promise<void> {
  return invoke('import_pet', { bytes, newName })
}

export async function getBaseDataDir(): Promise<string> {
  return invoke('get_base_data_dir')
}

export async function getSettings(): Promise<Settings> {
  return invoke('get_settings')
}

export async function saveSettings(settings: Settings): Promise<void> {
  return invoke('save_settings', { settings })
}
