// Static-export stubs. In the read-only GitHub Pages build, the webpack alias
// in next.config.mjs swaps "@/actions/crud" for this module so no Server Action
// (`"use server"`) ends up in the static bundle. CRUD UI is hidden in static
// mode, so these are never actually invoked.

export async function saveRegion(_formData: FormData) {}
export async function deleteRegion(_formData: FormData) {}
export async function saveDiscipline(_formData: FormData) {}
export async function deleteDiscipline(_formData: FormData) {}
export async function saveProject(_formData: FormData) {}
export async function deleteProject(_formData: FormData) {}
export async function saveResource(_formData: FormData) {}
export async function deleteResource(_formData: FormData) {}
