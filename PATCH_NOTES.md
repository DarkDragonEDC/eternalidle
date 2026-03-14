# 📄 Patch Notes — Updates v1.5.5+
@everyone


### 🖼️ Interface e Qualidade de Vida (QoL)
- **Nova Barra Lateral (Desktop)**: A barra lateral no PC foi totalmente reformulada! Agora com um design mais moderno, limpo e com novos ícones para facilitar a navegação.
- **Avatares Reais**: Chega de ícones genéricos! A barra lateral de troca de personagens e a tela de seleção agora exibem a foto de perfil real que você escolheu para cada explorador.
- **Mercado (My Listings)**: Corrigimos o bug na aba "Meus Anúncios" que limitava a visualização a apenas 10 itens. Agora você pode ver todos os seus anúncios ativos e navegar entre as páginas sem erros.
- **Recuperação de Login**: Se a sua conexão falhar por "Token Inválido" (comum ao trocar de navegador ou após muito tempo logado), o jogo agora detecta isso automaticamente e te leva de volta à tela de login para renovar sua sessão, em vez de ficar tentando conectar infinitamente.
- **Otimização Mobile**: A tela de seleção de personagem e o painel de combate foram otimizados para celulares — avatares mais compactos, stats de combate legíveis e sem sobreposição de botões.

### 🐛 Bug Fixes & Improvements
* **World Boss Crash:** Fixed a critical server crash and memory leak where characters would get stuck in phantom fights forever if they achieved the Top 1 ranking with a final blast.
* **World Boss Data Consistency:** Ensure active fights guarantee your damage progress is safely stored if any crashes occur and clean up background processing ticks perfectly.
* **Character Selection:** Fixed an issue where the logout button was overlapping the text field on smaller resolution screens.
