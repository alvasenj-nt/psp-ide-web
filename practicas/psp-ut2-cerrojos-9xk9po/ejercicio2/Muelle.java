package ejercicio2;

/**
 * Muelle de carga del puerto (solo lectura).
 * Cada muelle tiene un número único y un nombre identificativo.
 */
public class Muelle {

    private final int numero;
    private final String nombre;

    public Muelle(int numero, String nombre) {
        this.numero = numero;
        this.nombre = nombre;
    }

    public int getNumero() {
        return numero;
    }

    public String getNombre() {
        return nombre;
    }
}

