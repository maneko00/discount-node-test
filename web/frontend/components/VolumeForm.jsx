import { useForm, useField } from '@shopify/react-form'
import { CurrencyCode } from '@shopify/react-i18n'
import { Redirect } from '@shopify/app-bridge/actions'
import { useAppBridge } from '@shopify/app-bridge-react'

import {
    ActiveDatesCard,
    CombinationCard,
    DiscountClass,
    DiscountMethod,
    MethodCard,
    DiscountStatus,
    RequirementType,
    SummaryCard,
    UsageLimitsCard,
    onBreadcrumbAction,
} from '@shopify/discount-app-components'
import {
    Banner,
    Card,
    Layout,
    Page,
    TextField,
    Stack,
    PageActions,
} from '@shopify/polaris'
import { data } from '@shopify/app-bridge/actions/Modal'
import { useEffect, useState } from 'react'
import { useAuthenticatedFetch } from '../hooks'

const todaysDate = new Date()
const METAFIELD_NAMESPACE = 'discount-tutorial'
const METAFIELD_CONFIGURATION_KEY = 'volume-config'
const FUNCTION_ID = '3c50efac-21ea-447e-8529-e4e8b1efcc7f'

export function VolumeForm({volume: initialVolume, pageTitle: pageTitle}) {
    const [volume, setVolume] = useState(initialVolume)
    const [isEdit, setIsEdit] = useState(true)
    useEffect(()=>{
        if(typeof volume === "undefined")
        {
            setIsEdit(false)
        }
    },[])

    const app = useAppBridge();
    const redirect = Redirect.create(app);
    const currencyCode = CurrencyCode.Cad;
    const authenticatedFetch = useAuthenticatedFetch();

    const {
        fields: {
            discountTitle,
            discountCode,
            discountMethod,
            combinesWith,
            requirementType,
            requirementSubtotal,
            requirementQuantity,
            usageTotalLimit,
            usageOncePerCustomer,
            startDate,
            endDate,
            configuration,
        },
        submit,
        submitting,
        dirty,
        reset,
        submitErrors,
        makeClean,
    } = useForm({
        fields: {
            discountTitle: useField(volume?.discountTitle || ''),
            discountMethod: useField(volume?.discountMethod || DiscountMethod.Code),
            discountCode: useField(volume?.discountCode || ''),
            combinesWith: useField(volume?.combinesWith || {
                orderDiscounts: false,
                productDiscounts: false,
                shippingDiscounts: false,
            }),
            requirementType: useField(volume?.requirementType || RequirementType.None),
            requirementSubtotal: useField(volume?.requirementSubtotal || '0'),
            requirementQuantity: useField(volume?.requirementQuantity || '0'),
            usageTotalLimit: useField(volume?.usageTotalLimit || null),
            usageOncePerCustomer: useField(volume?.usageOncePerCustomer || false),
            startDate: useField(volume?.startDate || todaysDate),
            endDate: useField(volume?.endDate || null),
            configuration: {
                quantity: useField(volume?.configuration.quantity || '1'),
                percentage: useField(volume?.configuration.percentage || '0'),
            },
        },
    // 構成をJSONメタフィールドに保存
    onSubmit: async (form) => {
        const discount = {
            functionId: FUNCTION_ID,
            combinesWith: form.combinesWith,
            startsAt: form.startDate,
            endsAt: form.endDate,
            metafields: [
            {
                namespace: METAFIELD_NAMESPACE,
                key: METAFIELD_CONFIGURATION_KEY,
                type: 'json',
                value: JSON.stringify({
                    quantity: parseInt(form.configuration.quantity),
                    percentage: parseFloat(form.configuration.percentage),
                }),
            },
            ],
        };

        let response;
        if(isEdit) {
            response = form.discountMethod === DiscountMethod.Automatic ?
                await authenticatedFetch("/api/discounts/update-automatic", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        data: {
                            ...discount,
                            title: form.discountTitle,
                            metafields:[{id: volume.metafieldId}] 
                        },
                        id: volume.id
                    }),
                }) : await authenticatedFetch("/api/discounts/update-code", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        data: {
                            ...discount,
                            title: form.discountTitle,
                            code: form.discountCode,
                            metafields:[{id: volume.metafieldId}] 
                        },
                        id: volume.id
                    }),
                })
        } else {
            response = form.discountMethod === DiscountMethod.Automatic ?
                await authenticatedFetch("/api/discounts/automatic", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...discount, title: form.discountTitle }),
            }) : await authenticatedFetch("/api/discounts/code", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...discount,
                        title: form.discountCode,
                        code: form.discountCode,
                    }),
                
            })
        }

        const data = (await response.json()).data;
        const remoteErrors = data.discountUpdate.userErrors
        if (remoteErrors.length > 0) {
            return { status: 'fail', errors: remoteErrors }
        }

      // ディスカウントページにリダイレクト
      redirect.dispatch(Redirect.Action.ADMIN_SECTION, {
        name: Redirect.ResourceType.Discount,
      })
      return { status: 'success' }
    },
  })

  const errorBanner =
    submitErrors.length > 0 ? (
      <Layout.Section>
        <Banner status="critical">
          <p>There were some issues with your form submission:</p>
          <ul>
            {submitErrors.map(({ message, field }, index) => {
              return (
                <li key={`${message}${index}`}>
                  {field.join('.')} {message}
                </li>
              )
            })}
          </ul>
        </Banner>
      </Layout.Section>
    ) : null

  return (
    <Page
      title={pageTitle}
      breadcrumbs={[
        {
          content: 'ディスカウント',
          onAction: () => onBreadcrumbAction(redirect, true),
        },
      ]}
      primaryAction={{
        content: 'Save',
        onAction: submit,
        disabled: !dirty,
        loading: submitting,
      }}
    >
      <Layout>
        {errorBanner}
        <Layout.Section>
          <form onSubmit={submit}>
            <MethodCard
              title="Volume"
              discountTitle={discountTitle}
              discountClass={DiscountClass.Product}
              discountCode={discountCode}
              discountMethod={discountMethod}
            />
            <Card title="Volume">
              <Card.Section>
                <Stack>
                  <TextField label="Minimum quantity" {...configuration.quantity} />
                  <TextField label="Discount percentage" {...configuration.percentage} suffix="%" />
                </Stack>
              </Card.Section>
            </Card>
            {discountMethod.value === DiscountMethod.Code && (
              <UsageLimitsCard
                totalUsageLimit={usageTotalLimit}
                oncePerCustomer={usageOncePerCustomer}
              />
            )}
            <CombinationCard
              combinableDiscountTypes={combinesWith}
              discountClass={DiscountClass.Product}
              discountDescriptor={
                discountMethod.value === DiscountMethod.Automatic
                  ? discountTitle.value
                  : discountCode.value
              }
            />
            <ActiveDatesCard
              startDate={startDate}
              endDate={endDate}
              timezoneAbbreviation="EST"
            />
          </form>
        </Layout.Section>
        <Layout.Section secondary>
          <SummaryCard
            header={{
              discountMethod: discountMethod.value,
              discountDescriptor:
                discountMethod.value === DiscountMethod.Automatic
                  ? discountTitle.value
                  : discountCode.value,
              appDiscountType: 'Volume',
              isEditing: false,
            }}
            performance={{
              status: DiscountStatus.Scheduled,
              usageCount: 0,
            }}
            minimumRequirements={{
              requirementType: requirementType.value,
              subtotal: requirementSubtotal.value,
              quantity: requirementQuantity.value,
              currencyCode: currencyCode,
            }}
            usageLimits={{
              oncePerCustomer: usageOncePerCustomer.value,
              totalUsageLimit: usageTotalLimit.value,
            }}
            activeDates={{
              startDate: startDate.value,
              endDate: endDate.value,
            }}
          />
        </Layout.Section>
        <Layout.Section>
          <PageActions
            primaryAction={{
              content: 'Save discount',
              onAction: submit,
              disabled: !dirty,
              loading: submitting,
            }}
            secondaryActions={[
              {
                content: 'Discard',
                onAction: () => onBreadcrumbAction(redirect, true),
              },
            ]}
          />
        </Layout.Section>
      </Layout>
    </Page>
  )
}
