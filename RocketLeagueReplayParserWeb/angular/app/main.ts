import {bootstrap}    from 'angular2/platform/browser';
import {AppComponent} from './app.component';
import {provide} from 'angular2/core';
import {HTTP_PROVIDERS} from 'angular2/http';

bootstrap(AppComponent, [HTTP_PROVIDERS]);