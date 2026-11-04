package ejercicio3;

import java.util.concurrent.locks.ReentrantLock;

/**
 * Ejercicio 3: impresora compartida de oficina.
 *
 * En una oficina cinco empleados envían documentos continuamente a una única
 * impresora compartida mientras la jornada permanece abierta (consulta
 * Main.java).
 *
 * Requisitos:
 * - La impresora solo admite un documento cada vez: ningún empleado puede
 *   contabilizar ni imprimir un documento mientras otro empleado la esté
 *   utilizando, y todos los empleados que esperan deben conseguir imprimir
 *   un número equilibrado de documentos al final de la jornada.
 * - Cuando se cierre la oficina desde otro hilo, todos los empleados deben
 *   enterarse de inmediato en cualquier arquitectura y terminar su ejecución.
 * - Utiliza el cerrojo ya definido en Oficina sin cambiar la firma de los
 *   métodos públicos.
 */
class Empleado implements Runnable {

    private final Oficina oficina;
    private long documentos = 0;

    public Empleado(Oficina oficina) {
        this.oficina = oficina;
    }

    @Override
    public void run() {
        while (oficina.estaAbierta()) {
            documentos++;
            oficina.imprimirDocumento();
        }
    }

    public long getDocumentos() {
        return documentos;
    }
}

public class Oficina {

    private final ReentrantLock cerrojo = new ReentrantLock();
    private boolean abierta = true;

    public ReentrantLock getCerrojo() {
        return cerrojo;
    }

    public boolean estaAbierta() {
        return abierta;
    }

    public void cerrar() {
        abierta = false;
    }

    /** Simula el tiempo que tarda la impresora en imprimir un documento (1 ms). */
    public void imprimirDocumento() {
        try {
            Thread.sleep(1);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}

