UPDATE `cms_profile_masters` AS `master`
JOIN (
  SELECT
    `id`,
    ROW_NUMBER() OVER (
      PARTITION BY `kind`
      ORDER BY `sort_order` ASC, `name` ASC, `id` ASC
    ) AS `normalized_sort_order`
  FROM `cms_profile_masters`
) AS `ordered` ON `ordered`.`id` = `master`.`id`
SET `master`.`sort_order` = `ordered`.`normalized_sort_order`;
