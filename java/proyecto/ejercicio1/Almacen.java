package ejercicio1;

/**
 * Ejercicio 1: el almacén compartido.
 *
 * La tienda tiene un almacén de camisetas que usan a la vez dos reponedores
 * y dos dependientes, cada uno en su propio hilo (consulta Main.java).
 *
 * Tras varias jornadas, el inventario no cuadra: el stock final no coincide
 * con el inicial más las camisetas repuestas menos las vendidas, y alguna
 * vez se han vendido camisetas que no existían.
 *
 * Tareas:
 * 1. Modifica esta clase para que el inventario sea siempre correcto, sin
 *    importar cuántos hilos la usen a la vez. No cambies la cabecera de los
 *    métodos públicos ni el comportamiento de cada uno.
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
 * 1. ¿Qué mecanismo has utilizado para resolver el problema y sobre qué
 *    objeto concreto actúa?
 *
 *
 * 2. Explica qué problema concreto podía producirse en vender() y por qué
 *    tu solución lo evita.
 *
 */
