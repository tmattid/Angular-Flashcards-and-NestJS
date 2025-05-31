import { NgModule } from '@angular/core'
import { AgGridModule } from 'ag-grid-angular'
import './dashboard/features/grid/config/ag-grid.config' // Import AG Grid configuration

@NgModule({
  imports: [AgGridModule],
})
export class AppModule {}
