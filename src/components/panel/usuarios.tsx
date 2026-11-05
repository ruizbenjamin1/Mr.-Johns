"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Lock, Plus, Save, Trash2, Unlock } from "lucide-react";
import { toast } from "sonner";
import {
  actualizarUsuario,
  bloquearPanel,
  crearUsuario,
  desbloquearPanel,
  eliminarUsuario,
  type PanelProtegido,
} from "@/app/acciones/usuarios";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLES_ASIGNABLES } from "@/lib/roles";
import type { Usuario } from "@/lib/tipos";

// === ALTA DE USUARIO ===
// rolFijo: el jefe de barra solo da de alta bartenders (no ve el selector).
export function FormularioAlta({ rolFijo }: { rolFijo?: string }) {
  const [pendiente, iniciar] = useTransition();
  const formulario = useRef<HTMLFormElement>(null);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const datos = {
      nombre: String(formData.get("nombre") ?? ""),
      usuario: String(formData.get("usuario") ?? ""),
      password: String(formData.get("password") ?? ""),
      telefono: String(formData.get("telefono") ?? ""),
      rol: rolFijo ?? String(formData.get("rol") ?? "mozo"),
    };
    iniciar(async () => {
      const r = await crearUsuario(datos);
      if (r.ok) {
        const etiqueta = ROLES_ASIGNABLES.find((x) => x.valor === datos.rol)?.etiqueta ?? datos.rol;
        toast.success(`¡${datos.nombre} (${etiqueta}) creado con éxito!`);
        formulario.current?.reset();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <form ref={formulario} onSubmit={enviar} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto_auto]">
      <Input name="nombre" placeholder="Nombre" aria-label="Nombre" required />
      <Input name="usuario" placeholder="Usuario" aria-label="Usuario" autoCapitalize="none" required />
      <Input name="password" placeholder="Contraseña" aria-label="Contraseña" autoComplete="new-password" required />
      <Input name="telefono" type="tel" placeholder="WhatsApp (ej 5491122334455)" aria-label="WhatsApp" />
      {!rolFijo && (
        <div className="lg:w-36">
          <NativeSelect name="rol" aria-label="Rol" defaultValue="mozo">
            {ROLES_ASIGNABLES.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.etiqueta}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
      <Button type="submit" disabled={pendiente} aria-label="Agregar usuario" className="font-bold">
        {pendiente ? <Loader2 className="animate-spin" /> : <Plus />}
        <span className="lg:sr-only">Agregar</span>
      </Button>
    </form>
  );
}

// === FILA EDITABLE ===
function FilaUsuario({ usuario, rolFijo }: { usuario: Usuario; rolFijo?: string }) {
  const [nombre, setNombre] = useState(usuario.nombre_real || "");
  const [userName, setUserName] = useState(usuario.user_name);
  const [password, setPassword] = useState("");
  const [telefono, setTelefono] = useState(usuario.telefono || "");
  const [rol, setRol] = useState(usuario.rol);
  const [pendiente, iniciar] = useTransition();

  function guardar() {
    iniciar(async () => {
      const r = await actualizarUsuario(usuario.user_name, {
        nombre,
        usuario: userName,
        password,
        telefono,
        rol: rolFijo ?? rol,
      });
      if (r.ok) {
        toast.success("Usuario modificado con éxito.");
        setPassword("");
      } else {
        toast.error(r.error);
      }
    });
  }

  function eliminar() {
    iniciar(async () => {
      const r = await eliminarUsuario(usuario.user_name);
      if (r.ok) toast.success("Usuario eliminado correctamente.");
      else toast.error(r.error);
    });
  }

  return (
    <TableRow>
      <TableCell>
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} aria-label="Nombre real" className="h-8 min-w-32" />
      </TableCell>
      <TableCell>
        <Input
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          aria-label="Usuario"
          autoCapitalize="none"
          className="h-8 min-w-28 font-bold"
        />
      </TableCell>
      <TableCell>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Dejar vacío para no cambiar"
          autoComplete="new-password"
          aria-label="Nueva contraseña"
          className="h-8 min-w-44"
        />
      </TableCell>
      <TableCell>
        <Input
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="WhatsApp"
          aria-label="Teléfono"
          className="h-8 min-w-32"
        />
      </TableCell>
      <TableCell>
        {rolFijo ? (
          <span className="text-muted-foreground text-xs">
            {ROLES_ASIGNABLES.find((r) => r.valor === rolFijo)?.etiqueta}
            <br />
            Para cambiar el rol, contactá a un administrador.
          </span>
        ) : (
          <div className="min-w-32">
            <NativeSelect value={rol} onChange={(e) => setRol(e.target.value)} aria-label="Rol" className="h-8">
              {ROLES_ASIGNABLES.map((r) => (
                <option key={r.valor} value={r.valor}>
                  {r.etiqueta}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="flex justify-center gap-2">
          <Button size="icon" onClick={guardar} disabled={pendiente} title="Guardar" aria-label={`Guardar cambios de ${usuario.user_name}`}>
            {pendiente ? <Loader2 className="animate-spin" /> : <Save />}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="destructive" disabled={pendiente} title="Eliminar" aria-label={`Eliminar a ${usuario.user_name}`}>
                <Trash2 />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar a &quot;{usuario.user_name}&quot;?</AlertDialogTitle>
                <AlertDialogDescription>Se borra permanentemente. No se puede deshacer.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={eliminar}>Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function TablaUsuarios({ usuarios, rolFijo }: { usuarios: Usuario[]; rolFijo?: string }) {
  if (usuarios.length === 0) {
    return <p className="text-muted-foreground py-2 text-center text-sm">No hay usuarios en esta categoría.</p>;
  }
  return (
    <Table className="text-xs">
      <TableHeader>
        <TableRow>
          <TableHead>Nombre Real</TableHead>
          <TableHead>Usuario</TableHead>
          <TableHead>Contraseña</TableHead>
          <TableHead>Teléfono</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead className="text-center">Acción</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {usuarios.map((u) => (
          // key con los datos: si el servidor devuelve valores nuevos, la fila se reinicia con ellos
          <FilaUsuario key={`${u.user_name}|${u.nombre_real}|${u.telefono}|${u.rol}`} usuario={u} rolFijo={rolFijo} />
        ))}
      </TableBody>
    </Table>
  );
}

// === BLOQUEO CON CLAVE ===
export function PanelBloqueado({ panel, texto }: { panel: PanelProtegido; texto: string }) {
  const [clave, setClave] = useState("");
  const [pendiente, iniciar] = useTransition();

  function desbloquear(e: React.FormEvent) {
    e.preventDefault();
    iniciar(async () => {
      const r = await desbloquearPanel(panel, clave);
      if (!r.ok) toast.error(r.error);
      setClave("");
    });
  }

  return (
    <form onSubmit={desbloquear} className="flex flex-col items-center gap-3 py-6 text-center">
      <Lock className="text-primary size-8" />
      <p className="text-muted-foreground text-sm">{texto}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Input
          type="password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          placeholder="Contraseña"
          aria-label="Contraseña de la sección"
          className="w-56"
        />
        <Button type="submit" disabled={pendiente || !clave} className="font-bold">
          {pendiente ? <Loader2 className="animate-spin" /> : <Unlock />}
          Desbloquear
        </Button>
      </div>
    </form>
  );
}

export function BotonOcultar({ panel }: { panel: PanelProtegido }) {
  const [pendiente, iniciar] = useTransition();
  return (
    <Button variant="outline" size="sm" disabled={pendiente} onClick={() => iniciar(() => bloquearPanel(panel))}>
      <Lock />
      Ocultar
    </Button>
  );
}
