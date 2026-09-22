<#import "template.ftl" as layout>
<#import "user-profile-commons.ftl" as userProfileCommons>
<#import "register-commons.ftl" as registerCommons>
<@layout.registrationLayout displayMessage=messagesPerField.exists('global') displayRequiredFields=true; section>
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
        <h1 id="kc-page-title" class="ll-title">Create your account <span class="ll-wave">🌱</span></h1>
        <p class="ll-subtitle">Join the adventure — learning starts here 🌟</p>
    <#elseif section = "form">
        <form id="kc-register-form" class="${properties.kcFormClass!}" action="${url.registrationAction}" method="post">

            <@userProfileCommons.userProfileFormFields; callback, attribute>
                <#if callback = "afterField">
                <#-- render password fields just under the username or email (if used as username) -->
                    <#if passwordRequired?? && (attribute.name == 'username' || (attribute.name == 'email' && realm.registrationEmailAsUsername))>
                        <div class="${properties.kcFormGroupClass!}">
                            <div class="${properties.kcLabelWrapperClass!}">
                                <label for="password" class="${properties.kcLabelClass!}">${msg("password")}</label> *
                            </div>
                            <div class="${properties.kcInputWrapperClass!}">
                                <div class="${properties.kcInputGroup!}" dir="ltr">
                                    <input type="password" id="password" class="${properties.kcInputClass!}" name="password"
                                           autocomplete="new-password"
                                           aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>"
                                    />
                                    <button class="${properties.kcFormPasswordVisibilityButtonClass!}" type="button" aria-label="${msg('showPassword')}"
                                            aria-controls="password"  data-password-toggle
                                            data-icon-show="👁" data-icon-hide="🙈"
                                            data-label-show="${msg('showPassword')}" data-label-hide="${msg('hidePassword')}">
                                        <i class="ll-eye" aria-hidden="true">👁</i>
                                    </button>
                                </div>

                                <#if messagesPerField.existsError('password')>
                                    <span id="input-error-password" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
	                                ${kcSanitize(messagesPerField.get('password'))?no_esc}
	                            </span>
                                </#if>
                            </div>
                        </div>

                        <div class="${properties.kcFormGroupClass!}">
                            <div class="${properties.kcLabelWrapperClass!}">
                                <label for="password-confirm"
                                       class="${properties.kcLabelClass!}">${msg("passwordConfirm")}</label> *
                            </div>
                            <div class="${properties.kcInputWrapperClass!}">
                                <div class="${properties.kcInputGroup!}" dir="ltr">
                                    <input type="password" id="password-confirm" class="${properties.kcInputClass!}"
                                           name="password-confirm" autocomplete="new-password"
                                           aria-invalid="<#if messagesPerField.existsError('password-confirm')>true</#if>"
                                    />
                                    <button class="${properties.kcFormPasswordVisibilityButtonClass!}" type="button" aria-label="${msg('showPassword')}"
                                            aria-controls="password-confirm"  data-password-toggle
                                            data-icon-show="👁" data-icon-hide="🙈"
                                            data-label-show="${msg('showPassword')}" data-label-hide="${msg('hidePassword')}">
                                        <i class="ll-eye" aria-hidden="true">👁</i>
                                    </button>
                                </div>

                                <#if messagesPerField.existsError('password-confirm')>
                                    <span id="input-error-password-confirm" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
	                                ${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}
	                            </span>
                                </#if>
                            </div>
                        </div>
                    </#if>
                </#if>
            </@userProfileCommons.userProfileFormFields>

            <@registerCommons.termsAcceptance/>

            <div class="${properties.kcFormGroupClass!}">
                <div id="kc-form-options" class="${properties.kcFormOptionsClass!}">
                    <div class="${properties.kcFormOptionsWrapperClass!}">
                        <span><a href="${url.loginUrl}">← Back to sign in</a></span>
                    </div>
                </div>

                <div id="kc-form-buttons" class="${properties.kcFormButtonsClass!}">
                    <input class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}" type="submit" value="Register"/>
                </div>
            </div>
        </form>
    <#-- Role prefill (issue #54): the SPA passes ?role=student|parent|teacher; keep it
         in a hidden field so the user-attribute role mapper puts it in the token. -->
    <script>
      (function () {
        var role = new URLSearchParams(window.location.search).get('role');
        if (!['student', 'parent', 'teacher'].includes(role)) return;
        var form = document.getElementById('kc-register-form');
        if (!form || form.querySelector('input[name="role"]')) return;
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'role';
        input.value = role;
        form.appendChild(input);
      })();
    </script>

        <script type="module" src="${url.resourcesPath}/js/passwordVisibility.js"></script>
    </#if>
</@layout.registrationLayout>
