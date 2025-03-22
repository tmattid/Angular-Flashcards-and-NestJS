export * from './aI.service';
import { AIService } from './aI.service';
export * from './app.service';
import { AppService } from './app.service';
export * from './authentication.service';
import { AuthenticationService } from './authentication.service';
export * from './flashcards.service';
import { FlashcardsService } from './flashcards.service';
export * from './users.service';
import { UsersService } from './users.service';
export const APIS = [AIService, AppService, AuthenticationService, FlashcardsService, UsersService];
