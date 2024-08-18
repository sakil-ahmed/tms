import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger.setup';
import { ValidationPipe } from '@nestjs/common';

const PORT = 3000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());

  setupSwagger(app);

  await app.listen(PORT);
}

bootstrap().then(() => {
  console.log(
    `Server is running on http://localhost:${PORT} and docs running on http://localhost:${PORT}/api/v1/docs`,
  );
});
