import { Injectable } from '@angular/core'
import { OpenAPI } from '../api/core/OpenAPI'
import { environment } from '../../environments/environment'

@Injectable({
  providedIn: 'root',
})
export class ApiConfigService {
  constructor() {
    // Configure the OpenAPI base URL
    OpenAPI.BASE = environment.apiUrl
    OpenAPI.WITH_CREDENTIALS = true
  }
}
