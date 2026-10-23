package ejercicio1;

/**
 * Ejercicio 1: el almacén compartido.
 *
 * Dos reponedores y dos dependientes trabajan a la vez sobre el mismo
 * almacén de camisetas. Cada reponedor repone 10.000 camisetas, una a una,
 * y cada dependiente intenta vender 8.000, una a una, partiendo de un stock
 * de 5.000 camisetas (lo puedes ver en Main).
 *
 * Tal como está, el almacén tiene condiciones de carrera: en una JVM real se
 * pierden reposiciones y pueden venderse camisetas que no existen.
 *
 * Tareas:
 * 1. Protege con synchronized la zona crítica de cada método.
 * 2. Responde a las preguntas del comentario del final del archivo.
 */
public class Almacen {

    private int camisetas;

    public Almacen(int camisetasIniciales) {
        this.camisetas = camisetasIniciales;
    }

    /** Añade una camiseta al stock. */
    public void reponer() {
        camisetas++;
    }

    /** Si queda alguna camiseta, la vende y devuelve true; si no, devuelve false. */
    public boolean vender() {
        if (camisetas > 0) {
            camisetas--;
            return true;
        }
        return false;
    }

    public int getCamisetas() {
        return camisetas;
    }
}

/*
 * Respuestas:
 *
 * 1. Con synchronized en los métodos de instancia, ¿qué objeto concreto
 *    actúa como cerrojo?
 *
 *
 * 2. ¿Por qué en vender() la comprobación (camisetas > 0) y el descuento
 *    (camisetas--) tienen que quedar dentro de la misma zona sincronizada?
 *
 */
