/**
 * Almacén de la tienda: un stock por prenda, compartido por todos los hilos.
 *
 * Requisitos:
 * - Cada prenda tiene su propio cerrojo, privado y final, con estos nombres:
 *   cerrojoCamisetas, cerrojoPantalones y cerrojoSudaderas.
 *   Quien vende camisetas nunca debe hacer esperar a quien vende pantalones.
 * - Toda lectura o escritura del stock de una prenda se hace con su cerrojo.
 * - vender() comprueba y descuenta como una sola operación: nunca se vende
 *   una unidad que no existe.
 * - reponer() y vender() lanzan IllegalArgumentException si las unidades no
 *   son positivas.
 */
public class Almacen {

    // Stock de cada prenda, indexado con prenda.ordinal()
    private final int[] stock = new int[Prenda.values().length];

    // TODO 1: declara los tres cerrojos dedicados


    public Almacen(int camisetas, int pantalones, int sudaderas) {
        stock[Prenda.CAMISETA.ordinal()] = camisetas;
        stock[Prenda.PANTALON.ordinal()] = pantalones;
        stock[Prenda.SUDADERA.ordinal()] = sudaderas;
    }

    // TODO 2: devuelve el cerrojo que corresponde a la prenda
    private Object cerrojoDe(Prenda prenda) {
        return null;
    }

    /**
     * Añade unidades al stock de la prenda.
     */
    public void reponer(Prenda prenda, int unidades) {
        // TODO 3
    }

    /**
     * Si hay unidades suficientes, las descuenta y devuelve true.
     * Si no las hay, devuelve false sin modificar el stock.
     */
    public boolean vender(Prenda prenda, int unidades) {
        // TODO 4
        return false;
    }

    /**
     * Devuelve el stock actual de la prenda.
     */
    public int getStock(Prenda prenda) {
        // TODO 5
        return 0;
    }

    public int getStockTotal() {
        int total = 0;
        for (Prenda prenda : Prenda.values()) {
            total += getStock(prenda);
        }
        return total;
    }
}
