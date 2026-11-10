export default async function (page, env, h) {
  const session = await h.login();
  const warehouses = (await (await h.api("/warehouses?limit=100")).json()).data;
  let warehouse, before;
  for (const candidate of warehouses) {
    const layout = (await (await h.api("/warehouses/" + candidate.id + "/layout")).json()).data;
    if (layout.elements.length) {
      warehouse = candidate;
      before = layout;
      break;
    }
  }
  h.assert(warehouse, "Ningún almacén de demostración tiene distribución.");
  await page.goto(env.baseUrl + "/app/almacenes/" + warehouse.id + "/editor");
  await h.visible(page.getByRole("heading", { name: "Editor de distribución" }));
  const first = before.elements[0];
  await h.visible(page.getByRole("button", { name: first.name, exact: true }));
  await page.getByRole("button", { name: first.name, exact: true }).click();
  await h.visible(page.getByText("Elemento seleccionado: " + first.code, { exact: true }));
  const name = page.getByLabel("Nombre del elemento");
  await name.fill("Borrador " + first.name);
  await h.visible(page.getByText("Cambios sin guardar", { exact: true }));
  const still = async () =>
    (await (await h.api("/warehouses/" + warehouse.id + "/layout")).json()).data;
  let remote = await still();
  h.assert(remote.revision === before.revision, "El borrador alteró la revisión persistida.");
  h.assert(remote.elements.find((e) => e.id === first.id).name === first.name, "El borrador modificó la distribución guardada.");
  // Un refresco de la caché no sustituye el borrador.
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  h.assert((await name.inputValue()) === "Borrador " + first.name, "El refresco reemplazó el borrador.");
  await page.getByRole("button", { name: "Descartar cambios", exact: true }).click();
  await page.getByRole("button", { name: "Descartar", exact: true }).click();
  await page.getByText("Cambios sin guardar", { exact: true }).waitFor({ state: "hidden" });
  await h.visible(page.getByRole("button", { name: first.name, exact: true }));
  remote = await still();
  h.assert(remote.revision === before.revision, "Descartar cambió la revisión.");
  void session;
}
