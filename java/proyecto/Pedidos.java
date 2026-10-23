import java.util.Random;

/**
 * Genera listas reproducibles de pedidos de una unidad. No modificar.
 */
public final class Pedidos {

    private Pedidos() {
    }

    /**
     * Devuelve una lista de pedidos: la misma semilla produce siempre la misma lista.
     */
    public static Prenda[] generar(long semilla, int cantidad) {
        Random aleatorio = new Random(semilla);
        Prenda[] prendas = Prenda.values();
        Prenda[] pedidos = new Prenda[cantidad];
        for (int i = 0; i < cantidad; i++) {
            pedidos[i] = prendas[aleatorio.nextInt(prendas.length)];
        }
        return pedidos;
    }
}
