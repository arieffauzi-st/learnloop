<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>
    <#if section = "header">
        <div class="ll-brand">
            <svg class="ll-logo" viewBox="0 0 48 48" role="img" aria-label="LearnLoop logo" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="44" height="44" rx="14" fill="#FF6B6B"/>
                <path d="M24 10c-8.3 0-14 4-14 4v13c0 2.5 1.8 4.4 4 4.4 2.1 0 3.8-1.7 3.9-3.9L24 26l6.1 1.5c.1 2.2 1.8 3.9 3.9 3.9 2.2 0 4-1.9 4-4.4V14s-5.7-4-14-4z" fill="#FFF9F0"/>
                <circle cx="18" cy="19" r="2.2" fill="#FF6B6B"/>
                <circle cx="30" cy="19" r="2.2" fill="#FF6B6B"/>
                <path d="M12 34c3.5 3 8 4 12 4s8.5-1 12-4" stroke="#FFD93D" stroke-width="3" stroke-linecap="round" fill="none"/>
            </svg>
            <span class="ll-brand-name">LearnLoop</span>
        </div>
        <h1 id="kc-page-title" class="ll-title">Sign in to LearnLoop <span class="ll-wave">👋</span></h1>
        <p class="ll-subtitle">Homework that feels like play ✨</p>
    <#elseif section = "form">
        <div id="kc-form">
          <div id="kc-form-wrapper">
            <#if realm.password>
                <form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
                    <#if !usernameHidden??>
                        <div class="${properties.kcFormGroupClass!}">
                            <label for="username" class="${properties.kcLabelClass!}"><#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if></label>

                            <input tabindex="2" id="username" class="${properties.kcInputClass!}" name="username" value="${(login.username!'')}"  type="text" autofocus autocomplete="username"
                                   aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"
                                   dir="ltr"
                            />

                            <#if messagesPerField.existsError('username','password')>
                                <span id="input-error" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                                        ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
                                </span>
                            </#if>

                        </div>
                    </#if>

                    <div class="${properties.kcFormGroupClass!}">
                        <label for="password" class="${properties.kcLabelClass!}">${msg("password")}</label>

                        <div class="${properties.kcInputGroup!}" dir="ltr">
                            <input tabindex="3" id="password" class="${properties.kcInputClass!}" name="password" type="password" autocomplete="current-password"
                                   aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"
                            />
                            <button class="${properties.kcFormPasswordVisibilityButtonClass!}" type="button" aria-label="${msg("showPassword")}"
                                    aria-controls="password" data-password-toggle tabindex="4"
                                    data-icon-show="👁" data-icon-hide="🙈"
                                    data-label-show="${msg('showPassword')}" data-label-hide="${msg('hidePassword')}">
                                <i class="ll-eye" aria-hidden="true">👁</i>
                            </button>
                        </div>

                        <#if usernameHidden?? && messagesPerField.existsError('username','password')>
                            <span id="input-error" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                                    ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
                            </span>
                        </#if>

                    </div>

                    <div class="${properties.kcFormGroupClass!} ${properties.kcFormSettingClass!}">
                        <div id="kc-form-options">
                            <#if realm.rememberMe && !usernameHidden??>
                                <div class="checkbox">
                                    <label>
                                        <#if login.rememberMe??>
                                            <input tabindex="5" id="rememberMe" name="rememberMe" type="checkbox" checked> ${msg("rememberMe")}
                                        <#else>
                                            <input tabindex="5" id="rememberMe" name="rememberMe" type="checkbox"> ${msg("rememberMe")}
                                        </#if>
                                    </label>
                                </div>
                            </#if>
                            </div>
                            <div class="${properties.kcFormOptionsWrapperClass!}">
                                <#if realm.resetPasswordAllowed>
                                    <span><a tabindex="6" href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a></span>
                                </#if>
                            </div>

                      </div>

                      <div id="kc-form-buttons" class="${properties.kcFormGroupClass!}">
                          <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
                          <input tabindex="7" class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}" name="login" id="kc-login" type="submit" value="Sign in"/>
                      </div>
                </form>
            </#if>
            </div>
        </div>
        <script type="module" src="${url.resourcesPath}/js/passwordVisibility.js"></script>
    <#elseif section = "info" >
        <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
            <div id="kc-registration-container">
                <div id="kc-registration">
                    <span>New here? <a tabindex="8" href="${url.registrationUrl}">Create an account 🌱</a></span>
                </div>
            </div>
        </#if>
    <#elseif section = "socialProviders" >
        <#if realm.password && social?? && social.providers?has_content>
            <div id="kc-social-providers" class="${properties.kcFormSocialAccountSectionClass!}">
                <hr/>
                <h2>${msg("identity-provider-login-label")}</h2>

                <ul class="${properties.kcFormSocialAccountListClass!}">
                    <#list social.providers as p>
                        <li>
                            <a id="social-${p.alias}" class="${properties.kcFormSocialAccountListButtonClass!}"
                                    type="button" href="${p.loginUrl}">
                                <span class="${properties.kcFormSocialAccountNameClass!}">${p.displayName!}</span>
                            </a>
                        </li>
                    </#list>
                </ul>
            </div>
        </#if>
    </#if>

</@layout.registrationLayout>
