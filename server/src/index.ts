import 'dotenv/config';

const { app } = await import('./app.js');

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`API de notificações em execução na porta ${port}`);
});
