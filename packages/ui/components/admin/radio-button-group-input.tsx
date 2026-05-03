import type { ChoicesProps, InputProps } from "ra-core";
import { FieldTitle, useChoices, useChoicesContext, useInput } from "ra-core";
import * as React from "react";

import { cn } from "../../lib";
import { Label } from "../label";
import { RadioGroup, RadioGroupItem } from "../radio-group";
import { Skeleton } from "../skeleton";
import { FormField, FormControl, FormLabel, FormError } from "./form";
import { InputHelperText } from "./input-helper-text";

/**
 * Single-select input rendered as a list of radio buttons, arranged vertically or horizontally.
 *
 * Use `<RadioButtonGroupInput>` when you have a small set of options (2-5) that users should
 * see all at once, like status, priority, or category fields. For longer lists, prefer
 * `<SelectInput>`. Set `row` to `true` for horizontal layout.
 *
 * @see {@link https://marmelab.com/shadcn-admin-kit/docs/radiobuttongroupinput/ RadioButtonGroupInput documentation}
 *
 * @example
 * import { Edit, SimpleForm, TextInput, RadioButtonGroupInput } from '@/components/admin';
 *
 * const PostEdit = () => (
 *   <Edit>
 *     <SimpleForm>
 *       <TextInput source="title" />
 *       <RadioButtonGroupInput
 *         source="category"
 *         choices={[
 *           { id: 'tech', name: 'Tech' },
 *           { id: 'lifestyle', name: 'Lifestyle' },
 *           { id: 'people', name: 'People' },
 *         ]}
 *       />
 *     </SimpleForm>
 *   </Edit>
 * );
 */
export const RadioButtonGroupInput = (inProps: RadioButtonGroupInputProps) => {
	const {
		choices: choicesProp,
		isFetching: isFetchingProp,
		isLoading: isLoadingProp,
		isPending: isPendingProp,
		resource: resourceProp,
		source: sourceProp,

		format,
		onBlur,
		onChange,
		parse,
		validate,
		disabled,
		readOnly,

		optionText,
		optionValue = "id",
		translateChoice,
		disableValue = "disabled",

		className,
		helperText,
		label,
		row,
		...rest
	} = inProps;

	const {
		allChoices,
		isPending,
		error: fetchError,
		resource,
		source,
	} = useChoicesContext({
		choices: choicesProp,
		isFetching: isFetchingProp,
		isLoading: isLoadingProp,
		isPending: isPendingProp,
		resource: resourceProp,
		source: sourceProp,
	});

	if (source === undefined) {
		throw new Error(
			`If you're not wrapping the RadioButtonGroupInput inside a ReferenceArrayInput, you must provide the source prop`,
		);
	}

	if (!isPending && !fetchError && allChoices === undefined) {
		throw new Error(
			`If you're not wrapping the RadioButtonGroupInput inside a ReferenceArrayInput, you must provide the choices prop`,
		);
	}

	const { id, field, isRequired } = useInput({
		format,
		onBlur,
		onChange,
		parse,
		resource,
		source,
		validate,
		disabled,
		readOnly,
		...rest,
	});

	const { getChoiceText, getChoiceValue, getDisableValue } = useChoices({
		optionText,
		optionValue,
		translateChoice,
		disableValue,
	});

	if (isPending) {
		return <Skeleton className="h-9 w-full" />;
	}

	return (
		<FormField id={id} className={className} name={field.name}>
			{label && (
				<FormLabel>
					<FieldTitle label={label} source={source} resource={resource} isRequired={isRequired} />
				</FormLabel>
			)}

			<FormControl>
				<RadioGroup
					{...rest}
					value={field.value || ""}
					onValueChange={field.onChange}
					className={cn("flex", row ? "gap-4 flex-row" : "gap-2 flex-col")}
					disabled={disabled || readOnly}
				>
					{allChoices?.map((choice) => {
						const value = getChoiceValue(choice);
						const isDisabled = disabled || readOnly || getDisableValue(choice);

						return (
							<div key={value} className="space-x-2 flex items-center">
								<RadioGroupItem value={value} id={`${id}-${value}`} disabled={isDisabled} />
								<Label
									htmlFor={`${id}-${value}`}
									className={cn(
										"text-sm font-normal cursor-pointer",
										isDisabled && "cursor-not-allowed opacity-50",
									)}
								>
									{getChoiceText(choice)}
								</Label>
							</div>
						);
					})}
				</RadioGroup>
			</FormControl>
			<InputHelperText helperText={helperText} />
			<FormError />
		</FormField>
	);
};

export interface RadioButtonGroupInputProps
	extends
		Partial<InputProps>,
		ChoicesProps,
		Omit<React.ComponentProps<typeof RadioGroup>, "defaultValue" | "onBlur" | "onChange" | "type"> {
	row?: boolean;
}
