import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class DiagJUnitTest {

    @Test
    public void sumaCorrecta() {
        assertEquals(4, 2 + 2);
    }

    @Test
    public void falloEsperado() {
        assertEquals("Fallo provocado para comprobar el informe", 5, 2 + 2);
    }
}
